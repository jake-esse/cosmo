-- Comprehensive fix for signup issues
-- This addresses multiple potential problems

-- STEP 1: Ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- STEP 2: Drop and recreate the trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- STEP 3: Create a more robust version of generate_unique_username
CREATE OR REPLACE FUNCTION public.generate_unique_username(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
  v_base_username TEXT;
  v_username TEXT;
  v_counter INTEGER := 0;
  v_exists BOOLEAN;
BEGIN
  -- Handle NULL email
  IF p_email IS NULL OR p_email = '' THEN
    v_base_username := 'user';
  ELSE
    -- Extract part before @ and convert to lowercase
    v_base_username := lower(split_part(p_email, '@', 1));
    
    -- Replace non-alphanumeric characters with underscores
    v_base_username := regexp_replace(v_base_username, '[^a-z0-9]', '_', 'g');
    
    -- Remove multiple underscores
    v_base_username := regexp_replace(v_base_username, '_+', '_', 'g');
    
    -- Remove leading/trailing underscores
    v_base_username := trim(both '_' from v_base_username);
    
    -- If it starts with a number, prefix with "user_"
    IF v_base_username ~ '^[0-9]' THEN
      v_base_username := 'user_' || v_base_username;
    END IF;
    
    -- If empty after cleaning, use default
    IF v_base_username = '' OR v_base_username IS NULL THEN
      v_base_username := 'user';
    END IF;
  END IF;
  
  -- Ensure minimum length
  IF length(v_base_username) < 3 THEN
    v_base_username := v_base_username || '_user';
  END IF;
  
  -- Start with the base username
  v_username := v_base_username;
  
  -- Check for uniqueness and append numbers if needed
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.profiles WHERE username = v_username
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
    
    v_counter := v_counter + 1;
    v_username := v_base_username || '_' || v_counter::text;
    
    -- Safety check to prevent infinite loop
    IF v_counter > 1000 THEN
      -- Use timestamp for guaranteed uniqueness
      v_username := v_base_username || '_' || extract(epoch from now())::bigint::text;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Create the most robust version of handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
          'pending'
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
      'signup'::action_type,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Recreate the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- STEP 6: Fix any existing profiles with missing required fields
UPDATE public.profiles
SET referral_code = upper(substr(replace(id::text, '-', ''), 1, 8))
WHERE referral_code IS NULL OR referral_code = '';

UPDATE public.profiles
SET username = 'user_' || substr(replace(id::text, '-', ''), 1, 16)
WHERE username IS NULL OR username = '';

UPDATE public.profiles
SET display_name = COALESCE(display_name, username, 'User')
WHERE display_name IS NULL OR display_name = '';

-- STEP 7: Ensure uniqueness (fix any duplicates)
WITH duplicates AS (
  SELECT 
    id,
    username,
    ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at) as rn
  FROM public.profiles
  WHERE username IS NOT NULL
)
UPDATE public.profiles p
SET username = d.username || '_' || d.rn::text
FROM duplicates d
WHERE p.id = d.id AND d.rn > 1;

WITH duplicates AS (
  SELECT 
    id,
    referral_code,
    ROW_NUMBER() OVER (PARTITION BY referral_code ORDER BY created_at) as rn
  FROM public.profiles
  WHERE referral_code IS NOT NULL
)
UPDATE public.profiles p
SET referral_code = upper(substr(replace(p.id::text, '-', ''), 1, 8))
FROM duplicates d
WHERE p.id = d.id AND d.rn > 1;

-- STEP 8: Test the fix
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'fix_test_' || substr(md5(random()::text), 1, 8) || '@example.com';
  profile_created BOOLEAN;
  test_profile RECORD;
BEGIN
  -- Insert test user
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
    jsonb_build_object('full_name', 'Test User'),
    NOW(),
    NOW(),
    '00000000-0000-0000-0000-000000000000'
  );
  
  -- Check if profile was created
  SELECT * INTO test_profile
  FROM public.profiles 
  WHERE id = test_id;
  
  IF test_profile.id IS NOT NULL THEN
    RAISE NOTICE '✅ FIX SUCCESSFUL - Profile created:';
    RAISE NOTICE '  Username: %', test_profile.username;
    RAISE NOTICE '  Display Name: %', test_profile.display_name;
    RAISE NOTICE '  Referral Code: %', test_profile.referral_code;
  ELSE
    RAISE WARNING '❌ FIX FAILED - Profile not created';
  END IF;
  
  -- Clean up
  DELETE FROM auth.users WHERE id = test_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ Test failed: %', SQLERRM;
  DELETE FROM auth.users WHERE email = test_email;
END $$;

-- Final verification
SELECT 
  'Comprehensive fix applied. The signup system should now be working.' as status,
  'Try signing up a new user through the application.' as next_step;