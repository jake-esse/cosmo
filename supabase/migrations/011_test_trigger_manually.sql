-- Manual trigger test to see exact error
-- This will help identify if the problem is in the trigger or elsewhere

-- STEP 1: First, let's create a version of the trigger that logs everything
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user_debug()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_referral_code TEXT;
  v_referrer_id UUID;
  v_retry_count INTEGER := 0;
  v_code_retry_count INTEGER := 0;
  v_error_msg TEXT;
  v_error_detail TEXT;
  v_error_hint TEXT;
BEGIN
  -- Log the incoming data
  RAISE NOTICE '[SIGNUP DEBUG] Starting signup for user ID: %', NEW.id;
  RAISE NOTICE '[SIGNUP DEBUG] Email: %', NEW.email;
  RAISE NOTICE '[SIGNUP DEBUG] Metadata: %', NEW.raw_user_meta_data::text;
  
  -- Generate unique username
  BEGIN
    v_username := public.generate_unique_username(NEW.email);
    RAISE NOTICE '[SIGNUP DEBUG] Generated username: %', v_username;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT,
                           v_error_detail = PG_EXCEPTION_DETAIL;
    RAISE WARNING '[SIGNUP ERROR] Username generation failed: % (Detail: %)', v_error_msg, v_error_detail;
    -- Use fallback
    v_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 16);
    RAISE NOTICE '[SIGNUP DEBUG] Using fallback username: %', v_username;
  END;
  
  -- Determine display name
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'User'
  );
  RAISE NOTICE '[SIGNUP DEBUG] Display name: %', v_display_name;
  
  -- Generate unique referral code
  <<referral_code_loop>>
  LOOP
    v_referral_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    
    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code) THEN
      RAISE NOTICE '[SIGNUP DEBUG] Generated unique referral code: %', v_referral_code;
      EXIT referral_code_loop;
    END IF;
    
    v_code_retry_count := v_code_retry_count + 1;
    RAISE NOTICE '[SIGNUP DEBUG] Referral code % already exists, retry #%', v_referral_code, v_code_retry_count;
    
    IF v_code_retry_count > 10 THEN
      v_referral_code := upper(substr(replace(NEW.id::text, '-', ''), 1, 8));
      RAISE NOTICE '[SIGNUP DEBUG] Using ID-based referral code: %', v_referral_code;
      EXIT referral_code_loop;
    END IF;
  END LOOP referral_code_loop;
  
  -- Attempt to create profile
  <<retry_loop>>
  LOOP
    BEGIN
      RAISE NOTICE '[SIGNUP DEBUG] Attempting to insert profile...';
      RAISE NOTICE '[SIGNUP DEBUG]   id: %', NEW.id;
      RAISE NOTICE '[SIGNUP DEBUG]   username: %', v_username;
      RAISE NOTICE '[SIGNUP DEBUG]   display_name: %', v_display_name;
      RAISE NOTICE '[SIGNUP DEBUG]   referral_code: %', v_referral_code;
      
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
      );
      
      RAISE NOTICE '[SIGNUP DEBUG] ✅ Profile created successfully';
      EXIT retry_loop;
      
    EXCEPTION
      WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT,
                               v_error_detail = PG_EXCEPTION_DETAIL,
                               v_error_hint = PG_EXCEPTION_HINT;
        
        v_retry_count := v_retry_count + 1;
        RAISE WARNING '[SIGNUP ERROR] Unique violation on attempt %: % (Detail: %)', v_retry_count, v_error_msg, v_error_detail;
        
        IF v_retry_count > 3 THEN
          -- Use guaranteed unique values
          v_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 16);
          v_referral_code := upper(substr(replace(NEW.id::text, '-', ''), 1, 8));
          RAISE NOTICE '[SIGNUP DEBUG] Final retry with ID-based values';
        ELSE
          -- Regenerate
          v_username := public.generate_unique_username(NEW.email);
          v_referral_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
          RAISE NOTICE '[SIGNUP DEBUG] Retrying with new values';
        END IF;
        
      WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT,
                               v_error_detail = PG_EXCEPTION_DETAIL,
                               v_error_hint = PG_EXCEPTION_HINT;
        
        RAISE WARNING '[SIGNUP ERROR] Unexpected error creating profile: %', v_error_msg;
        RAISE WARNING '[SIGNUP ERROR] Detail: %', v_error_detail;
        RAISE WARNING '[SIGNUP ERROR] Hint: %', v_error_hint;
        RAISE WARNING '[SIGNUP ERROR] SQLSTATE: %', SQLSTATE;
        
        -- Last resort: minimal profile
        v_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 16);
        v_referral_code := upper(substr(replace(NEW.id::text, '-', ''), 1, 8));
        
        INSERT INTO public.profiles (id, username, display_name, referral_code)
        VALUES (NEW.id, v_username, v_display_name, v_referral_code)
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE '[SIGNUP DEBUG] Created minimal profile as fallback';
        EXIT retry_loop;
    END;
  END LOOP retry_loop;
  
  -- Handle referral
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    BEGIN
      RAISE NOTICE '[SIGNUP DEBUG] Processing referral code: %', NEW.raw_user_meta_data->>'referral_code';
      
      SELECT id INTO v_referrer_id
      FROM public.profiles
      WHERE referral_code = NEW.raw_user_meta_data->>'referral_code'
      AND id != NEW.id
      LIMIT 1;
      
      IF v_referrer_id IS NOT NULL THEN
        RAISE NOTICE '[SIGNUP DEBUG] Found referrer: %', v_referrer_id;
        
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
          'pending'
        )
        ON CONFLICT (referred_id) DO NOTHING;
        
        RAISE NOTICE '[SIGNUP DEBUG] Referral recorded';
      ELSE
        RAISE NOTICE '[SIGNUP DEBUG] Referral code not found';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
      RAISE WARNING '[SIGNUP ERROR] Error handling referral: %', v_error_msg;
    END;
  END IF;
  
  -- Award signup bonus
  BEGIN
    RAISE NOTICE '[SIGNUP DEBUG] Awarding signup bonus...';
    
    PERFORM public.award_equity_points(
      NEW.id,
      'signup'::action_type,
      100,
      'signup_' || NEW.id::text,
      'Welcome bonus for joining Cosmo'
    );
    
    RAISE NOTICE '[SIGNUP DEBUG] ✅ Signup bonus awarded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
    RAISE WARNING '[SIGNUP ERROR] Could not award signup bonus: %', v_error_msg;
  END;
  
  RAISE NOTICE '[SIGNUP DEBUG] ✅ Signup process completed for user %', NEW.id;
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT,
                         v_error_detail = PG_EXCEPTION_DETAIL;
  RAISE WARNING '[SIGNUP FATAL] Unhandled error in trigger: %', v_error_msg;
  RAISE WARNING '[SIGNUP FATAL] Detail: %', v_error_detail;
  -- Re-raise to see in logs
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the debug trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_debug();

-- Now test with a manual insert
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'debug_test_' || substr(md5(random()::text), 1, 8) || '@example.com';
  profile_created BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MANUAL TRIGGER TEST STARTING';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test ID: %', test_id;
  RAISE NOTICE 'Test Email: %', test_email;
  RAISE NOTICE '';
  
  -- Insert into auth.users to trigger our function
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    instance_id
  ) VALUES (
    test_id,
    test_email,
    crypt('testpassword123', gen_salt('bf')),
    NOW(),
    jsonb_build_object(
      'full_name', 'Debug Test User',
      'display_name', 'Debug Test'
    ),
    NOW(),
    NOW(),
    '00000000-0000-0000-0000-000000000000'
  );
  
  -- Check if profile was created
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = test_id) INTO profile_created;
  
  IF profile_created THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCCESS: Profile was created by trigger';
    
    -- Show the created profile
    PERFORM p.username, p.display_name, p.referral_code
    FROM public.profiles p
    WHERE id = test_id;
    
    -- Clean up
    DELETE FROM auth.users WHERE id = test_id;
    RAISE NOTICE '✅ Test data cleaned up';
  ELSE
    RAISE NOTICE '';
    RAISE WARNING '❌ FAILURE: Profile was NOT created by trigger';
    RAISE WARNING 'Check the warnings above for error details';
    
    -- Try to clean up anyway
    DELETE FROM auth.users WHERE id = test_id;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MANUAL TRIGGER TEST COMPLETE';
  RAISE NOTICE '========================================';
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ TEST FAILED WITH ERROR: %', SQLERRM;
  RAISE WARNING 'Check the output above for [SIGNUP DEBUG] and [SIGNUP ERROR] messages';
  -- Try to clean up
  DELETE FROM auth.users WHERE email = test_email;
END $$;

-- Check if we need to look at specific columns or constraints
SELECT 
  'After running this test, check the output for [SIGNUP DEBUG] and [SIGNUP ERROR] messages.' as instruction,
  'These will show exactly where the trigger is failing.' as next_step;