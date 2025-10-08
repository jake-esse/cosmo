-- Migration: Restructure Share Distribution System
-- Description: Remove email verification dependency and require KYC + agreement before share awards
-- Author: Ampel Platform Team
-- Date: 2025-10-05
--
-- CRITICAL CHANGES:
-- 1. Email verification is now informational only (no shares awarded)
-- 2. Shares require BOTH: KYC completion + user agreement (offering_participant = true)
-- 3. Order doesn't matter: can do KYC then agree, or agree then KYC
-- 4. Referrals only complete when both users have KYC + agreement
-- 5. Users can defer share acceptance and claim later

-- ============================================================================
-- PART 1: DISABLE EMAIL VERIFICATION SHARE TRIGGERS
-- ============================================================================

-- Drop the trigger that awards shares on email verification
DROP TRIGGER IF EXISTS on_user_verified ON auth.users;

-- Drop the trigger that completes referrals on email verification
DROP TRIGGER IF EXISTS on_email_verified ON auth.users;

-- Replace handle_user_verification to NOT award shares
-- This function now only handles profile creation for verified users
CREATE OR REPLACE FUNCTION public.handle_user_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_exists BOOLEAN;
  v_username TEXT;
  v_display_name TEXT;
  v_referral_code TEXT;
BEGIN
  -- Only process verified users
  IF NEW.email_confirmed_at IS NOT NULL THEN
    -- Check if this is a new verification
    IF (TG_OP = 'INSERT' AND NEW.email_confirmed_at IS NOT NULL) OR
       (TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN

      -- Check if profile exists
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id)
      INTO v_profile_exists;

      -- Create profile if it doesn't exist
      IF NOT v_profile_exists THEN
        -- Generate username
        BEGIN
          v_username := public.generate_unique_username(NEW.email);
        EXCEPTION WHEN OTHERS THEN
          v_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 16);
        END;

        -- Set display name
        v_display_name := COALESCE(
          NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
          NULLIF(split_part(NEW.email, '@', 1), ''),
          'User'
        );

        -- Generate referral code
        v_referral_code := upper(substr(replace(NEW.id::text, '-', ''), 1, 8));

        INSERT INTO public.profiles (
          id,
          username,
          display_name,
          referral_code,
          offering_participant
        ) VALUES (
          NEW.id,
          v_username,
          v_display_name,
          v_referral_code,
          NULL  -- NULL = undecided, no shares awarded yet
        ) ON CONFLICT (id) DO NOTHING;

        RAISE NOTICE 'Created profile for verified user % (NO SHARES AWARDED)', NEW.email;
      END IF;

      -- IMPORTANT: Email verification is informational only
      -- NO shares awarded here - user must complete KYC + agree to shares
      RAISE NOTICE 'User % verified email - awaiting KYC and agreement for share distribution', NEW.email;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_user_verification for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Remove the handle_email_verification function (no longer needed)
DROP FUNCTION IF EXISTS public.handle_email_verification() CASCADE;

-- Add comment explaining the change
COMMENT ON FUNCTION public.handle_user_verification() IS
'Creates profile for verified users but does NOT award shares. Shares require KYC + agreement.';

-- ============================================================================
-- PART 2: ADD TRACKING FIELDS TO PROFILES TABLE
-- ============================================================================

-- Add fields to track share award status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  shares_awarded_at TIMESTAMPTZ;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  shares_pending_kyc BOOLEAN DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_shares_awarded_at
ON public.profiles(shares_awarded_at)
WHERE shares_awarded_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_shares_pending_kyc
ON public.profiles(shares_pending_kyc)
WHERE shares_pending_kyc = true;

-- Add comments
COMMENT ON COLUMN public.profiles.shares_awarded_at IS
'Timestamp when signup and referral shares were awarded (requires KYC + agreement)';

COMMENT ON COLUMN public.profiles.shares_pending_kyc IS
'User agreed to shares but KYC not complete yet - will award when KYC done';

-- ============================================================================
-- PART 3: CREATE CENTRAL SHARE DISTRIBUTION FUNCTION
-- ============================================================================

-- This is the ONLY function that should award signup and referral shares
-- It checks BOTH requirements: KYC complete + user agreement
CREATE OR REPLACE FUNCTION public.award_shares_after_kyc_and_agreement(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_kyc_complete BOOLEAN;
  v_offering_participant BOOLEAN;
  v_already_awarded BOOLEAN;
  v_signup_bonus_exists BOOLEAN;
  v_referral RECORD;
  v_total_shares_awarded DECIMAL := 0;
  v_signup_tx_id UUID;
  v_referred_tx_id UUID;
  v_referrer_tx_id UUID;
BEGIN
  -- STEP 1: Check if KYC is complete
  SELECT EXISTS(
    SELECT 1 FROM public.persona_accounts
    WHERE user_id = p_user_id
  ) INTO v_kyc_complete;

  IF NOT v_kyc_complete THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'KYC not complete',
      'shares_awarded', 0,
      'kyc_complete', false
    );
  END IF;

  -- STEP 2: Check if user has agreed to receive shares
  SELECT offering_participant INTO v_offering_participant
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_offering_participant IS NULL OR v_offering_participant = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', CASE
        WHEN v_offering_participant = false THEN 'User opted out of shares'
        ELSE 'User has not agreed to receive shares yet'
      END,
      'shares_awarded', 0,
      'kyc_complete', true,
      'agreement_status', CASE
        WHEN v_offering_participant = false THEN 'opted_out'
        ELSE 'pending'
      END
    );
  END IF;

  -- STEP 3: Check if shares already awarded
  SELECT shares_awarded_at IS NOT NULL INTO v_already_awarded
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_already_awarded THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'Shares already awarded',
      'shares_awarded', 0,
      'already_awarded', true
    );
  END IF;

  -- STEP 4: Check if signup bonus already exists (shouldn't happen, but safety check)
  SELECT EXISTS(
    SELECT 1 FROM public.equity_transactions et
    JOIN public.user_interactions ui ON et.interaction_id = ui.id
    WHERE et.user_id = p_user_id
    AND ui.action_type = 'signup'
  ) INTO v_signup_bonus_exists;

  -- STEP 5: Award signup bonus (100 shares)
  IF NOT v_signup_bonus_exists THEN
    v_signup_tx_id := public.award_equity_points(
      p_user_id,
      'signup'::public.action_type,
      100,
      'kyc_signup_' || p_user_id::text,
      'Welcome bonus for joining Ampel (KYC verified)'
    );

    v_total_shares_awarded := v_total_shares_awarded + 100;

    RAISE NOTICE 'Awarded 100 signup shares to user %', p_user_id;
  END IF;

  -- STEP 6: Check for pending referral
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referred_id = p_user_id
  AND status = 'pending'
  LIMIT 1;

  -- STEP 7: Complete referral if exists AND referrer also has KYC + agreement
  IF v_referral.id IS NOT NULL THEN
    -- Check if referrer has KYC + agreement
    DECLARE
      v_referrer_kyc_complete BOOLEAN;
      v_referrer_offering_participant BOOLEAN;
    BEGIN
      -- Check referrer KYC
      SELECT EXISTS(
        SELECT 1 FROM public.persona_accounts
        WHERE user_id = v_referral.referrer_id
      ) INTO v_referrer_kyc_complete;

      -- Check referrer agreement
      SELECT offering_participant INTO v_referrer_offering_participant
      FROM public.profiles
      WHERE id = v_referral.referrer_id;

      -- Only complete referral if BOTH users have KYC + agreement
      IF v_referrer_kyc_complete AND v_referrer_offering_participant = true THEN
        -- Award referral bonus to referred user (25 shares)
        v_referred_tx_id := public.award_equity_points(
          p_user_id,
          'referral_completed'::public.action_type,
          25,
          'kyc_referral_bonus_' || v_referral.id::text,
          'Bonus for being referred to Ampel (KYC verified)'
        );

        v_total_shares_awarded := v_total_shares_awarded + 25;

        -- Award referrer bonus (50 shares)
        v_referrer_tx_id := public.award_equity_points(
          v_referral.referrer_id,
          'referral_completed'::public.action_type,
          50,
          'kyc_referrer_reward_' || v_referral.id::text,
          'Reward for referring a new user (both KYC verified)'
        );

        -- Update referral status
        UPDATE public.referrals
        SET
          status = 'completed'::public.referral_status,
          completed_at = NOW(),
          referrer_reward_transaction_id = v_referrer_tx_id,
          referred_reward_transaction_id = v_referred_tx_id,
          updated_at = NOW()
        WHERE id = v_referral.id;

        -- Update referrer stats
        UPDATE public.profiles
        SET
          referrals_completed_count = COALESCE(referrals_completed_count, 0) + 1,
          last_referral_at = NOW(),
          updated_at = NOW()
        WHERE id = v_referral.referrer_id;

        RAISE NOTICE 'Completed referral: 25 shares to %, 50 shares to referrer %',
          p_user_id, v_referral.referrer_id;
      ELSE
        -- Referrer not ready yet - keep referral pending
        RAISE NOTICE 'Referral pending - referrer needs KYC: %, agreement: %',
          v_referrer_kyc_complete, v_referrer_offering_participant;
      END IF;
    END;
  END IF;

  -- STEP 8: Mark shares as awarded
  UPDATE public.profiles
  SET
    shares_awarded_at = NOW(),
    shares_pending_kyc = false,
    shares_claimed_at = COALESCE(shares_claimed_at, NOW()),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- STEP 9: Return success
  v_result := jsonb_build_object(
    'success', true,
    'shares_awarded', v_total_shares_awarded,
    'signup_bonus_awarded', NOT v_signup_bonus_exists,
    'referral_bonus_awarded', v_referral.id IS NOT NULL,
    'kyc_complete', true,
    'agreement_status', 'accepted',
    'awarded_at', NOW()
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in award_shares_after_kyc_and_agreement for user %: %', p_user_id, SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'shares_awarded', 0
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.award_shares_after_kyc_and_agreement TO authenticated, service_role;

-- Add comment
COMMENT ON FUNCTION public.award_shares_after_kyc_and_agreement IS
'Central share distribution function. Awards signup and referral shares ONLY when user has completed KYC AND agreed to receive shares. Idempotent and safe to call multiple times.';

-- ============================================================================
-- PART 4: CREATE KYC COMPLETION TRIGGER
-- ============================================================================

-- When KYC completes (persona_accounts entry created), check if user ready for shares
CREATE OR REPLACE FUNCTION public.handle_kyc_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_offering_participant BOOLEAN;
BEGIN
  -- Check if user has already agreed to receive shares
  SELECT offering_participant INTO v_offering_participant
  FROM public.profiles
  WHERE id = NEW.user_id;

  RAISE NOTICE 'KYC completed for user %. Agreement status: %', NEW.user_id, v_offering_participant;

  -- If user has agreed (offering_participant = true), award shares immediately
  IF v_offering_participant = true THEN
    v_result := public.award_shares_after_kyc_and_agreement(NEW.user_id);

    IF (v_result->>'success')::boolean = true THEN
      RAISE NOTICE 'KYC completion: Awarded % shares to user %',
        v_result->>'shares_awarded', NEW.user_id;
    ELSE
      RAISE WARNING 'KYC completion: Could not award shares to user %: %',
        NEW.user_id, v_result->>'reason';
    END IF;
  ELSE
    -- User hasn't agreed yet - they'll get shares when they agree on onboarding
    RAISE NOTICE 'KYC completion: User % has not agreed to shares yet - waiting for onboarding',
      NEW.user_id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_kyc_completion for user %: %', NEW.user_id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on persona_accounts insert
DROP TRIGGER IF EXISTS after_kyc_completion ON public.persona_accounts;
CREATE TRIGGER after_kyc_completion
  AFTER INSERT ON public.persona_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_kyc_completion();

COMMENT ON FUNCTION public.handle_kyc_completion IS
'Trigger function that fires when KYC completes. Awards shares if user has already agreed.';

COMMENT ON TRIGGER after_kyc_completion ON public.persona_accounts IS
'Awards shares when KYC completes, if user has already agreed to receive them';

-- ============================================================================
-- PART 5: UPDATE ONBOARDING FUNCTIONS
-- ============================================================================

-- Update complete_education_acknowledgment to use new share distribution logic
CREATE OR REPLACE FUNCTION public.complete_education_acknowledgment(
  p_user_id UUID,
  p_sections_read JSONB,
  p_time_spent INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_acknowledgment_id UUID;
  v_profile_exists BOOLEAN;
  v_share_result JSONB;
BEGIN
  -- Check if profile exists for this user
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_profile_exists;

  -- If profile doesn't exist, create it first
  IF NOT v_profile_exists THEN
    INSERT INTO public.profiles (
      id,
      referral_code,
      offering_participant,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      upper(substr(replace(p_user_id::text, '-', ''), 1, 8)),
      true, -- User is accepting shares by completing education
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      offering_participant = true,
      updated_at = NOW();
  ELSE
    -- Update existing profile to mark as offering participant
    UPDATE public.profiles
    SET
      offering_participant = true,
      shares_claimed_at = COALESCE(shares_claimed_at, NOW()),
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  -- Insert or update education acknowledgment
  INSERT INTO public.education_acknowledgments (
    user_id,
    acknowledged_at,
    version,
    all_sections_read,
    sections_read,
    time_spent_seconds,
    created_at
  ) VALUES (
    p_user_id,
    NOW(),
    '1.0',
    true,
    p_sections_read,
    p_time_spent,
    NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    acknowledged_at = NOW(),
    all_sections_read = true,
    sections_read = p_sections_read,
    time_spent_seconds = education_acknowledgments.time_spent_seconds + EXCLUDED.time_spent_seconds
  RETURNING id INTO v_acknowledgment_id;

  -- Update profile to mark education as completed
  UPDATE public.profiles
  SET
    education_completed_at = COALESCE(education_completed_at, NOW()),
    education_version = '1.0',
    onboarding_step = 'complete',
    onboarding_completed = true,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- CRITICAL: Try to award shares using the new KYC-gated function
  v_share_result := public.award_shares_after_kyc_and_agreement(p_user_id);

  -- Check the result
  IF (v_share_result->>'success')::boolean = true THEN
    -- Shares awarded successfully
    v_result := jsonb_build_object(
      'success', true,
      'acknowledgment_id', v_acknowledgment_id,
      'education_completed', true,
      'shares_awarded', true,
      'total_shares', (v_share_result->>'shares_awarded')::int,
      'kyc_complete', true
    );
  ELSIF v_share_result->>'reason' = 'KYC not complete' THEN
    -- KYC not complete - mark as pending
    UPDATE public.profiles
    SET shares_pending_kyc = true
    WHERE id = p_user_id;

    v_result := jsonb_build_object(
      'success', true,
      'acknowledgment_id', v_acknowledgment_id,
      'education_completed', true,
      'shares_awarded', false,
      'shares_pending_kyc', true,
      'kyc_complete', false,
      'message', 'Education complete. Complete KYC to receive your shares.'
    );
  ELSE
    -- Some other issue
    v_result := jsonb_build_object(
      'success', true,
      'acknowledgment_id', v_acknowledgment_id,
      'education_completed', true,
      'shares_awarded', false,
      'reason', v_share_result->>'reason'
    );
  END IF;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  v_result := jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.complete_education_acknowledgment IS
'Completes education and sets offering_participant = true. Awards shares if KYC complete, otherwise marks as pending.';

-- ============================================================================
-- PART 6: UPDATE DEFERRED SHARE ACCEPTANCE FUNCTION
-- ============================================================================

-- Update accept_deferred_shares to use new distribution logic
CREATE OR REPLACE FUNCTION public.accept_deferred_shares(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_share_result JSONB;
  v_current_participant_status BOOLEAN;
BEGIN
  -- Check current status
  SELECT offering_participant INTO v_current_participant_status
  FROM public.profiles
  WHERE id = p_user_id;

  -- If user already opted in and has shares, return error
  IF v_current_participant_status = true THEN
    SELECT shares_awarded_at IS NOT NULL INTO v_current_participant_status
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_current_participant_status THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Shares already claimed',
        'shares_awarded', 0
      );
    END IF;
  END IF;

  -- Update profile to mark as offering participant
  UPDATE public.profiles
  SET
    offering_participant = true,
    shares_claimed_at = COALESCE(shares_claimed_at, NOW()),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Try to award shares (will check KYC requirement)
  v_share_result := public.award_shares_after_kyc_and_agreement(p_user_id);

  -- Return the result
  IF (v_share_result->>'success')::boolean = true THEN
    RETURN jsonb_build_object(
      'success', true,
      'shares_awarded', (v_share_result->>'shares_awarded')::decimal,
      'signup_bonus_awarded', (v_share_result->>'signup_bonus_awarded')::boolean,
      'referral_bonus_awarded', (v_share_result->>'referral_bonus_awarded')::boolean,
      'message', 'Shares awarded successfully!'
    );
  ELSE
    -- Shares not awarded yet (probably KYC not complete)
    IF v_share_result->>'reason' = 'KYC not complete' THEN
      UPDATE public.profiles
      SET shares_pending_kyc = true
      WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'shares_awarded', 0,
      'shares_pending_kyc', v_share_result->>'reason' = 'KYC not complete',
      'message', 'Agreement recorded. ' ||
        CASE
          WHEN v_share_result->>'reason' = 'KYC not complete'
          THEN 'Complete KYC to receive your shares.'
          ELSE v_share_result->>'reason'
        END
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'shares_awarded', 0
  );
END;
$$;

COMMENT ON FUNCTION public.accept_deferred_shares IS
'Called when user accepts shares after initially skipping. Awards shares if KYC complete.';

-- ============================================================================
-- PART 7: CLEANUP LEGACY FUNCTIONS (Optional - comment out if issues arise)
-- ============================================================================

-- Remove the old award_signup_bonus_if_accepted function (replaced by award_shares_after_kyc_and_agreement)
DROP FUNCTION IF EXISTS public.award_signup_bonus_if_accepted(UUID);

-- Remove complete_pending_referral_for_user (logic now in award_shares_after_kyc_and_agreement)
-- Keep it commented for now in case needed for backward compatibility
-- DROP FUNCTION IF EXISTS public.complete_pending_referral_for_user(UUID);

-- ============================================================================
-- PART 8: ADD HELPER FUNCTIONS FOR DEBUGGING
-- ============================================================================

-- Helper function to check share eligibility
CREATE OR REPLACE FUNCTION public.check_share_eligibility(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_kyc_complete BOOLEAN;
  v_offering_participant BOOLEAN;
  v_shares_awarded_at TIMESTAMPTZ;
  v_shares_pending_kyc BOOLEAN;
  v_education_completed_at TIMESTAMPTZ;
BEGIN
  -- Get all relevant data
  SELECT
    offering_participant,
    shares_awarded_at,
    shares_pending_kyc,
    education_completed_at
  INTO
    v_offering_participant,
    v_shares_awarded_at,
    v_shares_pending_kyc,
    v_education_completed_at
  FROM public.profiles
  WHERE id = p_user_id;

  -- Check KYC status
  SELECT EXISTS(
    SELECT 1 FROM public.persona_accounts
    WHERE user_id = p_user_id
  ) INTO v_kyc_complete;

  -- Build result
  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'kyc_complete', v_kyc_complete,
    'offering_participant', v_offering_participant,
    'education_completed', v_education_completed_at IS NOT NULL,
    'shares_awarded', v_shares_awarded_at IS NOT NULL,
    'shares_awarded_at', v_shares_awarded_at,
    'shares_pending_kyc', v_shares_pending_kyc,
    'eligible_for_shares',
      v_kyc_complete AND
      v_offering_participant = true AND
      v_shares_awarded_at IS NULL,
    'blocking_reason', CASE
      WHEN v_shares_awarded_at IS NOT NULL THEN 'Already awarded'
      WHEN v_offering_participant = false THEN 'User opted out'
      WHEN v_offering_participant IS NULL THEN 'User has not agreed yet'
      WHEN NOT v_kyc_complete THEN 'KYC not complete'
      ELSE 'Ready to award'
    END
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_share_eligibility TO authenticated, service_role;

COMMENT ON FUNCTION public.check_share_eligibility IS
'Debug function to check why a user is or is not eligible for shares';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 058 completed successfully';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CHANGES:';
  RAISE NOTICE '1. Email verification is now informational only';
  RAISE NOTICE '2. Shares require BOTH KYC + agreement';
  RAISE NOTICE '3. New function: award_shares_after_kyc_and_agreement()';
  RAISE NOTICE '4. New trigger: after_kyc_completion';
  RAISE NOTICE '5. Updated: complete_education_acknowledgment()';
  RAISE NOTICE '6. Updated: accept_deferred_shares()';
  RAISE NOTICE '========================================';
END $$;
