-- Fix the share opt-out system to properly prevent shares when user skips
-- The issue: NULL offering_participant was being treated as "allow shares"
-- The fix: Disable automatic share awarding on profile creation entirely

-- First, drop the existing trigger that awards shares on profile creation
DROP TRIGGER IF EXISTS award_signup_bonus_trigger ON profiles;

-- Drop the old function
DROP FUNCTION IF EXISTS award_signup_bonus();

-- Create a new function that will be called ONLY when user explicitly accepts shares
CREATE OR REPLACE FUNCTION award_signup_bonus_if_accepted(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_bonus_exists BOOLEAN;
  v_transaction_record RECORD;
BEGIN
  -- Check if signup bonus was already awarded
  SELECT EXISTS(
    SELECT 1 FROM equity_transactions et
    JOIN user_interactions ui ON et.interaction_id = ui.id
    WHERE et.user_id = p_user_id
    AND ui.action_type = 'signup'
  ) INTO v_bonus_exists;

  -- If bonus already exists, return without awarding again
  IF v_bonus_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'Signup bonus already awarded'
    );
  END IF;

  -- Award signup bonus
  SELECT * FROM award_equity_points(
    p_user_id,
    'signup'::action_type,
    100,
    'signup_' || p_user_id::text,
    'Welcome bonus for joining Ampel'
  ) INTO v_transaction_record;

  -- Also check and complete any pending referral
  PERFORM complete_pending_referral_for_user(p_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_record.transaction_id,
    'shares_awarded', 100
  );
END;
$$;

-- Update the complete_education_acknowledgment function to award shares
CREATE OR REPLACE FUNCTION complete_education_acknowledgment(
  p_user_id UUID,
  p_sections_read JSONB,
  p_time_spent INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_acknowledgment_id UUID;
  v_profile_exists BOOLEAN;
  v_signup_bonus_result JSONB;
BEGIN
  -- Check if profile exists for this user
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;

  -- If profile doesn't exist, create it first
  IF NOT v_profile_exists THEN
    INSERT INTO profiles (
      id,
      referral_code,
      offering_participant,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      substr(md5(random()::text), 1, 8),
      true, -- User is accepting shares by completing education
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    -- Update existing profile to mark as offering participant
    UPDATE profiles
    SET
      offering_participant = true,
      shares_claimed_at = now(),
      updated_at = now()
    WHERE id = p_user_id;
  END IF;

  -- Insert or update education acknowledgment
  INSERT INTO education_acknowledgments (
    user_id,
    acknowledged_at,
    version,
    all_sections_read,
    sections_read,
    time_spent_seconds,
    created_at
  ) VALUES (
    p_user_id,
    now(),
    '1.0',
    true,
    p_sections_read,
    p_time_spent,
    now()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    acknowledged_at = now(),
    all_sections_read = true,
    sections_read = p_sections_read,
    time_spent_seconds = education_acknowledgments.time_spent_seconds + EXCLUDED.time_spent_seconds;

  -- Update profile to mark education as completed
  UPDATE profiles
  SET
    education_completed_at = now(),
    education_version = '1.0',
    onboarding_step = 'complete',
    onboarding_completed = true,
    updated_at = now()
  WHERE id = p_user_id
  AND education_completed_at IS NULL;

  -- Award signup bonus (this function checks if already awarded)
  SELECT award_signup_bonus_if_accepted(p_user_id) INTO v_signup_bonus_result;

  -- Return success response
  v_result := jsonb_build_object(
    'success', true,
    'acknowledgment_id', v_acknowledgment_id,
    'education_completed', true,
    'shares_awarded', COALESCE(v_signup_bonus_result->>'shares_awarded', '0')::int > 0
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN v_result;
END;
$$;

-- Create a function for handling profile creation WITHOUT awarding shares
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create profile for new user WITHOUT setting offering_participant
  -- This ensures no shares are awarded until user explicitly opts in
  INSERT INTO public.profiles (
    id,
    referral_code,
    offering_participant, -- Leave as NULL until user decides
    created_at,
    updated_at
  ) VALUES (
    new.id,
    substr(md5(random()::text), 1, 8),
    NULL, -- CRITICAL: NULL means undecided, no shares awarded
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Ensure trigger is set up correctly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update the accept_deferred_shares function to handle all scenarios
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
  v_transaction_id UUID;
BEGIN
  -- Check if user already opted in
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND offering_participant = true
    AND shares_claimed_at IS NOT NULL
  ) THEN
    -- Check if they actually have shares
    SELECT EXISTS(
      SELECT 1 FROM equity_transactions
      WHERE user_id = p_user_id
    ) INTO v_signup_bonus_exists;

    IF v_signup_bonus_exists THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Shares already claimed',
        'shares_awarded', 0
      );
    END IF;
  END IF;

  -- Update profile to mark as offering participant
  UPDATE profiles
  SET
    offering_participant = true,
    shares_claimed_at = now(),
    updated_at = now()
  WHERE id = p_user_id;

  -- Check if signup bonus was already awarded
  SELECT EXISTS(
    SELECT 1 FROM equity_transactions et
    JOIN user_interactions ui ON et.interaction_id = ui.id
    WHERE et.user_id = p_user_id
    AND ui.action_type = 'signup'
  ) INTO v_signup_bonus_exists;

  -- Award signup bonus if not already awarded
  IF NOT v_signup_bonus_exists THEN
    SELECT transaction_id, points INTO v_transaction_id, v_total_shares_awarded
    FROM award_equity_points(
      p_user_id,
      'signup'::action_type,
      100,
      'deferred_signup_' || p_user_id::text,
      'Deferred welcome bonus for joining Ampel'
    );
  END IF;

  -- Check for pending referral
  SELECT * FROM referrals
  WHERE referred_id = p_user_id
  AND status = 'pending'
  INTO v_referral_record;

  -- If referral exists and is pending, complete it
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