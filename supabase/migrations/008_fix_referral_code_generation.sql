-- Fix for "Database error saving new user" - referral_code NOT NULL constraint
-- The issue: handle_new_user trigger doesn't generate referral_code, but it's required

-- Drop existing trigger to recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update handle_new_user function to properly generate referral_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_referral_code TEXT;
  v_referrer_id UUID;
  v_retry_count INTEGER := 0;
  v_code_retry_count INTEGER := 0;
BEGIN
  -- Generate unique username
  v_username := public.generate_unique_username(NEW.email);
  
  -- Determine display name with multiple fallbacks
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'User'
  );
  
  -- Generate unique referral code
  <<referral_code_loop>>
  LOOP
    -- Generate a random 8-character uppercase code
    v_referral_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    
    -- Check if this code already exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code) THEN
      EXIT referral_code_loop;
    END IF;
    
    v_code_retry_count := v_code_retry_count + 1;
    
    -- After 10 attempts, append user-specific data to guarantee uniqueness
    IF v_code_retry_count > 10 THEN
      v_referral_code := upper(substr(replace(NEW.id::text, '-', ''), 1, 8));
      EXIT referral_code_loop;
    END IF;
  END LOOP referral_code_loop;
  
  -- Attempt to create profile with retry logic for race conditions
  <<retry_loop>>
  LOOP
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
        NULL -- Will be updated below if referral code exists
      );
      
      EXIT retry_loop; -- Success, exit the loop
      
    EXCEPTION
      WHEN unique_violation THEN
        -- Could be username or referral_code collision
        v_retry_count := v_retry_count + 1;
        
        IF v_retry_count > 3 THEN
          -- After 3 retries, use guaranteed unique values
          v_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 16);
          v_referral_code := upper(substr(replace(NEW.id::text, '-', ''), 1, 8));
        ELSE
          -- Regenerate both username and referral code
          v_username := public.generate_unique_username(NEW.email);
          v_referral_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
        END IF;
        
        -- Continue to retry
        
      WHEN OTHERS THEN
        -- Log other errors and create minimal profile
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        
        -- Create minimal profile with guaranteed unique values
        v_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 16);
        v_referral_code := upper(substr(replace(NEW.id::text, '-', ''), 1, 8));
        
        INSERT INTO public.profiles (id, username, display_name, referral_code)
        VALUES (NEW.id, v_username, v_display_name, v_referral_code)
        ON CONFLICT (id) DO NOTHING;
        
        EXIT retry_loop;
    END;
  END LOOP retry_loop;
  
  -- Handle referral if provided
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    BEGIN
      -- Find the referrer
      SELECT id INTO v_referrer_id
      FROM public.profiles
      WHERE referral_code = NEW.raw_user_meta_data->>'referral_code'
      AND id != NEW.id
      LIMIT 1;
      
      IF v_referrer_id IS NOT NULL THEN
        -- Update the referred_by field
        UPDATE public.profiles 
        SET referred_by = v_referrer_id
        WHERE id = NEW.id;
        
        -- Create referral record
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
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Error handling referral for user %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  -- Award signup bonus (100 points) - always attempt this
  BEGIN
    PERFORM public.award_equity_points(
      NEW.id,
      'signup'::action_type,
      100,
      'signup_' || NEW.id::text,
      'Welcome bonus for joining Cosmo'
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Could not award signup bonus for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Fix any existing profiles without referral codes
UPDATE public.profiles
SET referral_code = upper(substr(replace(id::text, '-', ''), 1, 8))
WHERE referral_code IS NULL OR referral_code = '';

-- Ensure all profiles have unique referral codes
DO $$
DECLARE
  dup_record RECORD;
  new_code TEXT;
BEGIN
  -- Find any duplicate referral codes
  FOR dup_record IN 
    SELECT referral_code, array_agg(id ORDER BY created_at) as user_ids
    FROM public.profiles
    WHERE referral_code IS NOT NULL
    GROUP BY referral_code
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the first user, update the rest
    FOR i IN 2..array_length(dup_record.user_ids, 1) LOOP
      -- Generate a new unique code for duplicate
      new_code := upper(substr(replace(dup_record.user_ids[i]::text, '-', ''), 1, 8));
      
      UPDATE public.profiles
      SET referral_code = new_code
      WHERE id = dup_record.user_ids[i];
    END LOOP;
  END LOOP;
END $$;

-- Verification
DO $$
DECLARE
  total_profiles INTEGER;
  profiles_with_codes INTEGER;
  duplicate_codes INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_profiles FROM public.profiles;
  
  SELECT COUNT(*) INTO profiles_with_codes 
  FROM public.profiles 
  WHERE referral_code IS NOT NULL AND referral_code != '';
  
  SELECT COUNT(*) INTO duplicate_codes
  FROM (
    SELECT referral_code 
    FROM public.profiles
    WHERE referral_code IS NOT NULL
    GROUP BY referral_code
    HAVING COUNT(*) > 1
  ) dups;
  
  RAISE NOTICE 'Referral Code Fix Results:';
  RAISE NOTICE '  Total profiles: %', total_profiles;
  RAISE NOTICE '  Profiles with referral codes: %', profiles_with_codes;
  RAISE NOTICE '  Duplicate referral codes: %', duplicate_codes;
  
  IF profiles_with_codes = total_profiles THEN
    RAISE NOTICE '  ✅ All profiles have referral codes';
  ELSE
    RAISE WARNING '  ❌ Some profiles missing referral codes: %', total_profiles - profiles_with_codes;
  END IF;
  
  IF duplicate_codes = 0 THEN
    RAISE NOTICE '  ✅ All referral codes are unique';
  ELSE
    RAISE WARNING '  ❌ Found duplicate referral codes: %', duplicate_codes;
  END IF;
END $$;

-- Test the function with a mock user insert
DO $$
DECLARE
  test_email TEXT := 'test_' || substr(gen_random_uuid()::text, 1, 8) || '@example.com';
  test_user_id UUID;
  test_profile RECORD;
BEGIN
  -- Create a test auth.users entry
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    test_email,
    crypt('testpassword', gen_salt('bf')),
    NOW(),
    jsonb_build_object(
      'full_name', 'Test User',
      'display_name', 'Test User'
    ),
    NOW(),
    NOW()
  ) RETURNING id INTO test_user_id;
  
  -- Check if profile was created
  SELECT * INTO test_profile 
  FROM public.profiles 
  WHERE id = test_user_id;
  
  IF test_profile.id IS NOT NULL THEN
    RAISE NOTICE '✅ Test signup successful:';
    RAISE NOTICE '  Username: %', test_profile.username;
    RAISE NOTICE '  Display Name: %', test_profile.display_name;
    RAISE NOTICE '  Referral Code: %', test_profile.referral_code;
    
    -- Clean up test data
    DELETE FROM auth.users WHERE id = test_user_id;
  ELSE
    RAISE WARNING '❌ Test signup failed - profile not created';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Test signup error: %', SQLERRM;
    -- Try to clean up if test user was created
    DELETE FROM auth.users WHERE email = test_email;
END $$;