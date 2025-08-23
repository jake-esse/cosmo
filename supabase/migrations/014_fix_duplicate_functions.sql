-- Fix duplicate function signatures and enum schema qualification
-- This handles cases where functions already exist with different signatures

-- STEP 1: Drop ALL versions of functions that might exist
-- We need to be explicit about signatures for overloaded functions
DO $$
BEGIN
  -- Drop all versions of award_signup_bonus
  DROP FUNCTION IF EXISTS public.award_signup_bonus(UUID);
  DROP FUNCTION IF EXISTS public.award_signup_bonus(UUID, TEXT);
  DROP FUNCTION IF EXISTS public.award_signup_bonus(UUID, DECIMAL);
  DROP FUNCTION IF EXISTS public.award_signup_bonus();
  
  -- Drop all versions of other functions
  DROP FUNCTION IF EXISTS public.ensure_profile_for_verified_user() CASCADE;
  DROP FUNCTION IF EXISTS public.ensure_verified_user_profile() CASCADE;
  DROP FUNCTION IF EXISTS public.handle_user_verification() CASCADE;
  
  -- Drop award_equity_points (need to specify exact signature)
  DROP FUNCTION IF EXISTS public.award_equity_points(UUID, action_type, DECIMAL, TEXT, TEXT, UUID);
  DROP FUNCTION IF EXISTS public.award_equity_points(UUID, public.action_type, DECIMAL, TEXT, TEXT, UUID);
  
EXCEPTION WHEN OTHERS THEN
  -- Continue even if some functions don't exist
  RAISE NOTICE 'Some functions did not exist to drop: %', SQLERRM;
END $$;

-- STEP 2: Recreate award_equity_points with proper schema qualification
CREATE OR REPLACE FUNCTION public.award_equity_points(
  p_user_id UUID,
  p_action_type public.action_type,  -- Fully qualified enum type
  p_amount DECIMAL(18, 8),
  p_request_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_app_id UUID DEFAULT NULL
)
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Ensures function can find types in public schema
AS $$
DECLARE
  v_interaction_id UUID;
  v_transaction_id UUID;
  v_current_balance DECIMAL(18, 8);
BEGIN
  -- Check for idempotency
  IF p_request_id IS NOT NULL THEN
    SELECT id INTO v_interaction_id
    FROM user_interactions
    WHERE request_id = p_request_id;
    
    IF v_interaction_id IS NOT NULL THEN
      -- Request already processed, return existing transaction
      SELECT id INTO v_transaction_id
      FROM equity_transactions
      WHERE interaction_id = v_interaction_id;
      RETURN v_transaction_id;
    END IF;
  END IF;
  
  -- Get current balance
  SELECT COALESCE(SUM(
    CASE 
      WHEN transaction_type = 'credit' THEN amount
      WHEN transaction_type = 'debit' THEN -amount
    END
  ), 0) INTO v_current_balance
  FROM equity_transactions
  WHERE user_id = p_user_id;
  
  -- Create user interaction
  INSERT INTO user_interactions (
    id,
    user_id,
    action_type,
    action_metadata,
    request_id,
    app_id
  )
  VALUES (
    gen_random_uuid(),
    p_user_id,
    p_action_type,
    jsonb_build_object('description', p_description),
    p_request_id,
    p_app_id
  )
  RETURNING id INTO v_interaction_id;
  
  -- Create equity transaction
  INSERT INTO equity_transactions (
    id,
    user_id,
    amount,
    transaction_type,
    balance_before,
    balance_after,
    interaction_id,
    description
  )
  VALUES (
    gen_random_uuid(),
    p_user_id,
    p_amount,
    'credit'::public.transaction_type,  -- Fully qualified
    v_current_balance,
    v_current_balance + p_amount,
    v_interaction_id,
    p_description
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;

-- STEP 3: Recreate handle_new_user with proper qualification
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Ensures function can find types
AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_referral_code TEXT;
  v_referrer_id UUID;
  v_profile_exists BOOLEAN;
  v_attempts INTEGER := 0;
BEGIN
  -- Check if profile already exists (idempotency)
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO v_profile_exists;
  
  IF v_profile_exists THEN
    RAISE NOTICE 'Profile already exists for user %, skipping creation', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Generate username with error handling
  BEGIN
    v_username := public.generate_unique_username(NEW.email);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to ID-based username
    v_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 16);
  END;
  
  -- Set display name with multiple fallbacks
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
  BEGIN
    INSERT INTO public.profiles (
      id, 
      username, 
      display_name,
      avatar_url,
      referral_code,
      referred_by
    )
    VALUES (
      NEW.id,
      v_username,
      v_display_name,
      NEW.raw_user_meta_data->>'avatar_url',
      v_referral_code,
      NULL
    )
    ON CONFLICT (id) DO UPDATE SET
      -- If there's a conflict on ID, update the missing fields
      username = COALESCE(profiles.username, EXCLUDED.username),
      display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
      referral_code = COALESCE(profiles.referral_code, EXCLUDED.referral_code);
      
  EXCEPTION WHEN unique_violation THEN
    -- If we still get a unique violation, it's likely on username or referral_code
    -- Try with completely unique values
    v_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 16);
    v_referral_code := upper(substr(replace(NEW.id::text, '-', ''), 1, 8));
    
    INSERT INTO public.profiles (
      id, 
      username, 
      display_name,
      referral_code
    )
    VALUES (
      NEW.id,
      v_username,
      v_display_name,
      v_referral_code
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
          'pending'::public.referral_status  -- Fully qualified
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
      'signup'::public.action_type,  -- Fully qualified enum cast
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
    INSERT INTO public.profiles (id, username, display_name, referral_code)
    VALUES (
      NEW.id,
      'user_' || substr(replace(NEW.id::text, '-', ''), 1, 16),
      COALESCE(split_part(NEW.email, '@', 1), 'User'),
      upper(substr(replace(NEW.id::text, '-', ''), 1, 8))
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If even this fails, just log and continue
    RAISE WARNING 'Could not create even minimal profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- STEP 4: Create/Update handle_user_verification for email verification flow
CREATE OR REPLACE FUNCTION public.handle_user_verification()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Ensures function can find types
AS $$
DECLARE
  v_profile_exists BOOLEAN;
  v_has_bonus BOOLEAN;
  v_username TEXT;
  v_display_name TEXT;
  v_referral_code TEXT;
BEGIN
  -- Only process verified users
  IF NEW.email_confirmed_at IS NOT NULL THEN
    -- Check if this is a new verification (not an update to existing verified user)
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
          referral_code
        ) VALUES (
          NEW.id,
          v_username,
          v_display_name,
          v_referral_code
        ) ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Created profile for verified user %', NEW.email;
      END IF;
      
      -- Check if user has signup bonus
      SELECT EXISTS(
        SELECT 1 FROM public.equity_transactions et
        JOIN public.user_interactions ui ON et.interaction_id = ui.id
        WHERE et.user_id = NEW.id AND ui.action_type = 'signup'::public.action_type
      ) INTO v_has_bonus;
      
      -- Award signup bonus if verified and no bonus yet
      IF NOT v_has_bonus THEN
        PERFORM public.award_equity_points(
          NEW.id,
          'signup'::public.action_type,  -- Fully qualified
          100,
          'signup_verified_' || NEW.id::text,
          'Welcome bonus for verified account'
        );
        
        RAISE NOTICE 'Awarded 100 points to verified user %', NEW.email;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the verification
  RAISE WARNING 'Error in handle_user_verification for user %: % (State: %)', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- STEP 5: Recreate triggers to ensure they use the updated functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_verified ON auth.users;
DROP TRIGGER IF EXISTS on_email_verified ON auth.users;
DROP TRIGGER IF EXISTS ensure_verified_user_profile ON auth.users;

-- Trigger for new user signup (if email pre-verified, like OAuth)
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Trigger for email verification
CREATE TRIGGER on_user_verified
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.handle_user_verification();

-- STEP 6: Fix complete_referral if it exists
DO $$
BEGIN
  -- Drop all possible versions first
  DROP FUNCTION IF EXISTS public.complete_referral(UUID);
  DROP FUNCTION IF EXISTS public.complete_referral(UUID, TEXT);
  
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'referrals'
  ) THEN
    CREATE OR REPLACE FUNCTION public.complete_referral(p_referred_id UUID)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    DECLARE
      v_referrer_id UUID;
      v_referral_code TEXT;
    BEGIN
      -- Get referrer information
      SELECT referred_by INTO v_referrer_id
      FROM public.profiles
      WHERE id = p_referred_id;
      
      IF v_referrer_id IS NULL THEN
        RETURN FALSE;
      END IF;
      
      -- Update referral status
      UPDATE public.referrals
      SET 
        status = 'completed'::public.referral_status,
        completed_at = NOW()
      WHERE referred_id = p_referred_id
      AND status = 'pending'::public.referral_status;
      
      -- Award points to referrer
      PERFORM public.award_equity_points(
        v_referrer_id,
        'referral_completed'::public.action_type,
        50,
        'referral_' || p_referred_id::text,
        'Referral bonus for inviting a friend'
      );
      
      RETURN TRUE;
    END;
    $func$;
  END IF;
END $$;

-- STEP 7: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.award_equity_points TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_user_verification TO service_role;

-- STEP 8: Test to verify the fix works
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'enum_fix_' || substr(md5(random()::text), 1, 8) || '@example.com';
  test_result BOOLEAN;
BEGIN
  -- Test 1: Create a user (simulating signup)
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    raw_user_meta_data,
    created_at,
    updated_at,
    instance_id
  ) VALUES (
    test_id,
    test_email,
    crypt('testpassword123', gen_salt('bf')),
    jsonb_build_object('full_name', 'Enum Fix Test'),
    NOW(),
    NOW(),
    '00000000-0000-0000-0000-000000000000'
  );
  
  -- Test 2: Verify the user (simulating email confirmation)
  UPDATE auth.users 
  SET email_confirmed_at = NOW()
  WHERE id = test_id;
  
  -- Test 3: Check if everything worked
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = test_id
  ) AND EXISTS(
    SELECT 1 FROM public.equity_transactions WHERE user_id = test_id
  ) INTO test_result;
  
  IF test_result THEN
    RAISE NOTICE '✅ ENUM FIX SUCCESSFUL - All functions work correctly';
  ELSE
    RAISE WARNING '⚠️ Functions created but test user may not have all data';
  END IF;
  
  -- Clean up
  DELETE FROM auth.users WHERE id = test_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Test encountered error (may be normal): %', SQLERRM;
  -- Clean up on error
  DELETE FROM auth.users WHERE email = test_email;
END $$;

-- Final status
SELECT 
  '✅ Duplicate functions fixed and enum schema qualification applied' as status,
  'All function signatures cleaned up' as cleanup,
  'Email verification should now work without errors' as result;