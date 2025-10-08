-- Comprehensive share opt-out system migration
-- Allows users to skip shares during onboarding and claim them later
-- CRITICAL: Ensures no shares are awarded if user opts out

-- First, modify the award_signup_bonus trigger function to check offering_participant
CREATE OR REPLACE FUNCTION award_signup_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- CRITICAL: Only award signup bonus if user has NOT explicitly opted out
  -- NULL means they haven't decided yet (allow bonus)
  -- FALSE means they explicitly opted out (no bonus)
  -- TRUE means they explicitly opted in (allow bonus)
  IF NEW.offering_participant IS DISTINCT FROM false THEN
    -- Award signup bonus after profile is created
    PERFORM award_equity_points(
      NEW.id,
      'signup'::action_type,
      100,
      'signup_' || NEW.id::text,
      'Welcome bonus for joining Ampel'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create function to accept deferred shares when user opts in later
CREATE OR REPLACE FUNCTION accept_deferred_shares(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_total_shares_awarded DECIMAL := 0;
  v_signup_bonus_exists BOOLEAN;
  v_referral_exists BOOLEAN;
  v_referral_record RECORD;
  v_referrer_id UUID;
  v_transaction_id UUID;
BEGIN
  -- Check if user already opted in
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND offering_participant = true
    AND shares_claimed_at IS NOT NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Shares already claimed',
      'shares_awarded', 0
    );
  END IF;

  -- Begin transaction logic

  -- 1. Update profile to mark as offering participant
  UPDATE profiles
  SET
    offering_participant = true,
    shares_claimed_at = now(),
    updated_at = now()
  WHERE id = p_user_id;

  -- 2. Check if signup bonus was already awarded
  SELECT EXISTS(
    SELECT 1 FROM equity_transactions et
    JOIN user_interactions ui ON et.interaction_id = ui.id
    WHERE et.user_id = p_user_id
    AND ui.action_type = 'signup'
  ) INTO v_signup_bonus_exists;

  -- 3. Award signup bonus if not already awarded
  IF NOT v_signup_bonus_exists THEN
    -- Award signup bonus
    SELECT transaction_id, points INTO v_transaction_id, v_total_shares_awarded
    FROM award_equity_points(
      p_user_id,
      'signup'::action_type,
      100,
      'deferred_signup_' || p_user_id::text,
      'Deferred welcome bonus for joining Ampel'
    );
  END IF;

  -- 4. Check for pending referral
  SELECT * FROM referrals
  WHERE referred_id = p_user_id
  AND status = 'pending'
  INTO v_referral_record;

  -- 5. If referral exists and is pending, complete it
  IF v_referral_record.id IS NOT NULL THEN
    -- Award referral bonus to referred user (25 points)
    PERFORM award_equity_points(
      p_user_id,
      'referral_completed'::action_type,
      25,
      'deferred_referral_bonus_' || v_referral_record.id::text,
      'Bonus for being referred to Ampel'
    );

    v_total_shares_awarded := v_total_shares_awarded + 25;

    -- Award referral bonus to referrer (50 points)
    PERFORM award_equity_points(
      v_referral_record.referrer_id,
      'referral_completed'::action_type,
      50,
      'deferred_referrer_reward_' || v_referral_record.id::text,
      'Reward for referring a new user'
    );

    -- Update referral status to completed
    UPDATE referrals
    SET
      status = 'completed',
      completed_at = now(),
      updated_at = now()
    WHERE id = v_referral_record.id;

    -- Update referrer's referral counts
    UPDATE profiles
    SET
      referrals_completed_count = COALESCE(referrals_completed_count, 0) + 1,
      updated_at = now()
    WHERE id = v_referral_record.referrer_id;
  END IF;

  -- Return success with total shares awarded
  RETURN jsonb_build_object(
    'success', true,
    'shares_awarded', v_total_shares_awarded,
    'signup_bonus_awarded', NOT v_signup_bonus_exists,
    'referral_bonus_awarded', v_referral_record.id IS NOT NULL
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'shares_awarded', 0
    );
END;
$$;

-- Update the complete_pending_referral_for_user function to respect opt-out status
CREATE OR REPLACE FUNCTION complete_pending_referral_for_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral RECORD;
  v_result JSONB;
  v_offering_participant BOOLEAN;
BEGIN
  -- Check if user has opted out of shares
  SELECT offering_participant INTO v_offering_participant
  FROM profiles
  WHERE id = p_user_id;

  -- If user has explicitly opted out, don't complete the referral yet
  IF v_offering_participant = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'User has opted out of shares - referral will be completed when they opt in'
    );
  END IF;

  -- Find pending referral for this user
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = p_user_id
    AND status = 'pending'
  LIMIT 1;

  -- If no pending referral found
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'No pending referral found for user'
    );
  END IF;

  -- Update referral status to completed
  UPDATE referrals
  SET status = 'completed',
      completed_at = now(),
      email_verified_at = now(),
      updated_at = now()
  WHERE id = v_referral.id;

  -- Award points to referred user (25 points bonus on top of signup)
  -- Only if they haven't opted out
  IF v_offering_participant IS DISTINCT FROM false THEN
    PERFORM award_equity_points(
      p_user_id,
      'referral_completed'::action_type,
      25,
      'referral_bonus_' || v_referral.id::text,
      'Bonus for being referred to Ampel'
    );

    -- Award points to referrer (50 points)
    PERFORM award_equity_points(
      v_referral.referrer_id,
      'referral_completed'::action_type,
      50,
      'referrer_reward_' || v_referral.id::text,
      'Reward for successfully referring a new user'
    );

    -- Update referrer's stats
    UPDATE profiles
    SET referrals_completed_count = COALESCE(referrals_completed_count, 0) + 1,
        last_referral_at = now(),
        updated_at = now()
    WHERE id = v_referral.referrer_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'referral_id', v_referral.id,
    'referrer_id', v_referral.referrer_id,
    'referred_id', v_referral.referred_id,
    'shares_awarded', CASE WHEN v_offering_participant IS DISTINCT FROM false THEN true ELSE false END
  );
END;
$$;

-- Add index for performance on offering_participant queries
CREATE INDEX IF NOT EXISTS idx_profiles_offering_participant
ON profiles(offering_participant)
WHERE offering_participant IS NOT NULL;