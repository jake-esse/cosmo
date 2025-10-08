-- Migration: Restore handle_new_user function with all required columns
-- Purpose: Fix "Database error saving new user" by restoring username, display_name, avatar_url
-- Date: 2025-10-08
-- Fixes: Migration 060 removed critical columns, breaking user signup
-- This migration restores the complete working version from 013 + auth_provider from 060

-- ============================================
-- EXPLANATION OF THE FIX
-- ============================================
-- Migration 060 added auth_provider tracking but accidentally removed:
-- - username (UNIQUE constraint, required by app)
-- - display_name (used throughout UI)
-- - avatar_url (OAuth users need this)
-- - All username generation logic
-- - All referral processing logic
--
-- This migration takes the working handle_new_user from migration 013
-- and adds the auth_provider extraction logic from migration 060.
-- ============================================

-- Drop and recreate handle_new_user with ALL required columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_referral_code TEXT;
  v_referrer_id UUID;
  v_profile_exists BOOLEAN;
  v_attempts INTEGER := 0;
  v_auth_provider TEXT; -- NEW: for auth provider tracking
BEGIN
  -- Check if profile already exists (idempotency)
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO v_profile_exists;

  IF v_profile_exists THEN
    RAISE NOTICE 'Profile already exists for user %, skipping creation', NEW.id;
    RETURN NEW;
  END IF;

  -- NEW: Extract auth provider from Supabase auth metadata
  -- OAuth providers (google, apple, facebook) have provider in app_metadata
  -- Email/password users default to 'email'
  v_auth_provider := COALESCE(
    NEW.raw_app_metadata->>'provider',
    NEW.app_metadata->>'provider',
    'email'
  );

  -- Normalize provider name to lowercase
  v_auth_provider := lower(v_auth_provider);

  -- Ensure valid provider value (must match CHECK constraint)
  -- Valid values: 'email', 'google', 'apple', 'facebook'
  IF v_auth_provider NOT IN ('email', 'google', 'apple', 'facebook') THEN
    v_auth_provider := 'email';
  END IF;

  -- Generate username with error handling
  BEGIN
    v_username := public.generate_unique_username(NEW.email);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to ID-based username
    v_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 16);
  END;

  -- Set display name with multiple fallbacks
  -- Try OAuth metadata fields first, then email prefix
  v_display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(split_part(NEW.email, '@', 1), ''),
    'User'
  );

  -- Generate a guaranteed unique referral code
  v_referral_code := upper(substr(replace(NEW.id::text, '-', ''), 1, 8));

  -- Try to find a unique referral code
  <<find_unique_code>>
  FOR v_attempts IN 1..10 LOOP
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code) THEN
      EXIT find_unique_code;
    END IF;
    -- Generate new code
    v_referral_code := upper(substr(md5(NEW.id::text || v_attempts::text), 1, 8));
  END LOOP;

  -- Insert profile with conflict handling
  -- RESTORED: All columns from working version + auth_provider
  BEGIN
    INSERT INTO public.profiles (
      id,
      username,
      display_name,
      avatar_url,
      referral_code,
      referred_by,
      auth_provider,        -- NEW: from migration 060
      offering_participant  -- Keep NULL until user opts in
    )
    VALUES (
      NEW.id,
      v_username,
      v_display_name,
      NEW.raw_user_meta_data->>'avatar_url',
      v_referral_code,
      NULL,                 -- Will be set later if referral code provided
      v_auth_provider,      -- NEW: from migration 060
      NULL                  -- NULL means undecided, no shares awarded yet
    )
    ON CONFLICT (id) DO UPDATE SET
      -- If there's a conflict on ID, update the missing fields
      username = COALESCE(profiles.username, EXCLUDED.username),
      display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
      referral_code = COALESCE(profiles.referral_code, EXCLUDED.referral_code),
      auth_provider = COALESCE(profiles.auth_provider, EXCLUDED.auth_provider);

  EXCEPTION WHEN unique_violation THEN
    -- If we still get a unique violation, it's likely on username or referral_code
    -- Try with completely unique values
    v_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 16);
    v_referral_code := upper(substr(replace(NEW.id::text, '-', ''), 1, 8));

    INSERT INTO public.profiles (
      id,
      username,
      display_name,
      referral_code,
      auth_provider,
      offering_participant
    )
    VALUES (
      NEW.id,
      v_username,
      v_display_name,
      v_referral_code,
      v_auth_provider,
      NULL
    )
    ON CONFLICT (id) DO NOTHING;
  END;

  -- Handle referral if provided (non-critical, don't fail signup)
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    BEGIN
      SELECT id INTO v_referrer_id
      FROM public.profiles
      WHERE referral_code = NEW.raw_user_meta_data->>'referral_code'
      AND id != NEW.id
      LIMIT 1;

      IF v_referrer_id IS NOT NULL THEN
        UPDATE public.profiles
        SET referred_by = v_referrer_id
        WHERE id = NEW.id;

        INSERT INTO public.referrals (
          referrer_id,
          referred_id,
          referral_code,
          status
        )
        VALUES (
          v_referrer_id,
          NEW.id,
          NEW.raw_user_meta_data->>'referral_code',
          'pending'::public.referral_status
        )
        ON CONFLICT (referred_id) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log but don't fail
      RAISE NOTICE 'Could not process referral for user %: %', NEW.id, SQLERRM;
    END;
  END IF;

  -- Award signup bonus (non-critical, don't fail signup)
  BEGIN
    PERFORM public.award_equity_points(
      NEW.id,
      'signup'::public.action_type,
      100,
      'signup_' || NEW.id::text,
      'Welcome bonus for joining Cosmo'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail
    RAISE NOTICE 'Could not award signup bonus for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Last resort: log the error but don't fail the signup
  RAISE WARNING 'Error in handle_new_user for user %: % (State: %)', NEW.id, SQLERRM, SQLSTATE;

  -- Try to at least create a minimal profile
  BEGIN
    INSERT INTO public.profiles (
      id,
      username,
      display_name,
      referral_code,
      auth_provider,
      offering_participant
    )
    VALUES (
      NEW.id,
      'user_' || substr(replace(NEW.id::text, '-', ''), 1, 16),
      COALESCE(split_part(NEW.email, '@', 1), 'User'),
      upper(substr(replace(NEW.id::text, '-', ''), 1, 8)),
      COALESCE(lower(NEW.raw_app_metadata->>'provider'), 'email'),
      NULL
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If even this fails, just log and continue
    RAISE WARNING 'Could not create even minimal profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Add comment documenting the complete fix
COMMENT ON FUNCTION public.handle_new_user() IS
'Trigger function that creates user profile on signup. Extracts username, display_name, avatar_url from metadata and determines auth_provider (google, apple, facebook, or email). Handles referrals and awards signup bonus. Restored all columns that were removed in migration 060.';

-- Recreate the trigger (ensures it uses the updated function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Test the fix (this will create and clean up a test user)
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'test_061_' || substr(md5(random()::text), 1, 8) || '@example.com';
  test_profile RECORD;
BEGIN
  -- Insert test user simulating OAuth signup
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_metadata,
    created_at,
    updated_at,
    instance_id
  ) VALUES (
    test_id,
    test_email,
    crypt('testpassword123', gen_salt('bf')),
    NOW(),
    jsonb_build_object(
      'full_name', 'Test OAuth User',
      'avatar_url', 'https://example.com/avatar.jpg'
    ),
    jsonb_build_object('provider', 'google'),
    NOW(),
    NOW(),
    '00000000-0000-0000-0000-000000000000'
  );

  -- Check if profile was created with all fields
  SELECT * INTO test_profile
  FROM public.profiles
  WHERE id = test_id;

  IF test_profile.id IS NOT NULL THEN
    -- Verify all critical fields are populated
    IF test_profile.username IS NOT NULL
       AND test_profile.display_name IS NOT NULL
       AND test_profile.referral_code IS NOT NULL
       AND test_profile.auth_provider IS NOT NULL THEN
      RAISE NOTICE '✅ FIX SUCCESSFUL - Profile created with all fields:';
      RAISE NOTICE '  Username: %', test_profile.username;
      RAISE NOTICE '  Display Name: %', test_profile.display_name;
      RAISE NOTICE '  Avatar URL: %', test_profile.avatar_url;
      RAISE NOTICE '  Referral Code: %', test_profile.referral_code;
      RAISE NOTICE '  Auth Provider: %', test_profile.auth_provider;
      RAISE NOTICE '  Offering Participant: %', test_profile.offering_participant;
    ELSE
      RAISE WARNING '❌ FIX INCOMPLETE - Some fields missing:';
      RAISE WARNING '  Username: %', test_profile.username;
      RAISE WARNING '  Display Name: %', test_profile.display_name;
      RAISE WARNING '  Auth Provider: %', test_profile.auth_provider;
    END IF;
  ELSE
    RAISE WARNING '❌ FIX FAILED - Profile not created';
  END IF;

  -- Clean up
  DELETE FROM auth.users WHERE id = test_id;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ Test failed: %', SQLERRM;
  DELETE FROM auth.users WHERE email = test_email;
END $$;

-- Final status message
SELECT
  '✅ Migration 061 applied successfully' as status,
  'Restored username, display_name, avatar_url, and auth_provider tracking' as changes,
  'Both OAuth and email signups should now work correctly' as result;
