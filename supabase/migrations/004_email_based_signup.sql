-- Migration: Email-Based Signup with Auto-Generated Usernames
-- Date: 2025-08-22
-- Purpose: Update signup flow to use email as primary identifier and auto-generate unique usernames

-- Drop existing trigger to recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create function to generate unique username from email
CREATE OR REPLACE FUNCTION public.generate_unique_username(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
  v_base_username TEXT;
  v_username TEXT;
  v_counter INTEGER := 0;
  v_exists BOOLEAN;
BEGIN
  -- Extract part before @ and convert to lowercase
  v_base_username := lower(split_part(p_email, '@', 1));
  
  -- Replace non-alphanumeric characters with underscores
  v_base_username := regexp_replace(v_base_username, '[^a-z0-9]', '_', 'g');
  
  -- If it starts with a number, prefix with "user_"
  IF v_base_username ~ '^[0-9]' THEN
    v_base_username := 'user_' || v_base_username;
  END IF;
  
  -- If empty or null, generate a fallback
  IF v_base_username IS NULL OR v_base_username = '' THEN
    v_base_username := 'user';
  END IF;
  
  -- Start with the base username
  v_username := v_base_username;
  
  -- Check if username exists and append numbers if needed
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.profiles WHERE username = v_username
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
    
    v_counter := v_counter + 1;
    v_username := v_base_username || '_' || v_counter::text;
    
    -- Failsafe: if we've tried too many times, append a hash
    IF v_counter > 100 THEN
      v_username := v_base_username || '_' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_new_user function with better username generation and display name handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_referrer_id UUID;
  v_retry_count INTEGER := 0;
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
  
  -- Attempt to create profile with retry logic for race conditions
  <<retry_loop>>
  LOOP
    BEGIN
      INSERT INTO public.profiles (
        id, 
        username, 
        display_name,
        avatar_url,
        referred_by
      )
      VALUES (
        NEW.id,
        v_username,
        v_display_name,
        NEW.raw_user_meta_data->>'avatar_url',
        NULL -- Will be updated below if referral code exists
      );
      
      EXIT retry_loop; -- Success, exit the loop
      
    EXCEPTION
      WHEN unique_violation THEN
        -- Username collision occurred (race condition)
        v_retry_count := v_retry_count + 1;
        
        IF v_retry_count > 3 THEN
          -- After 3 retries, append a hash to guarantee uniqueness
          v_username := split_part(NEW.email, '@', 1) || '_' || substr(md5(NEW.id::text || clock_timestamp()::text), 1, 8);
        ELSE
          -- Try to regenerate username
          v_username := public.generate_unique_username(NEW.email);
        END IF;
        
        -- Continue to retry
        
      WHEN OTHERS THEN
        -- Log other errors and create minimal profile
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        
        -- Create minimal profile with guaranteed unique username
        v_username := 'user_' || substr(NEW.id::text, 1, 8);
        
        INSERT INTO public.profiles (id, username, display_name)
        VALUES (NEW.id, v_username, v_display_name)
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

-- Create helper function to get user display information
CREATE OR REPLACE FUNCTION public.get_user_display_info(p_user_id UUID)
RETURNS TABLE (
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  referral_code TEXT,
  current_balance DECIMAL(18, 8)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.email::TEXT,
    p.display_name::TEXT,
    p.avatar_url::TEXT,
    p.referral_code::TEXT,
    COALESCE(
      (SELECT SUM(
        CASE 
          WHEN et.transaction_type = 'credit' THEN et.amount
          WHEN et.transaction_type = 'debit' THEN -et.amount
        END
      )
      FROM public.equity_transactions et
      WHERE et.user_id = p_user_id), 
      0
    ) as current_balance
  FROM auth.users u
  INNER JOIN public.profiles p ON p.id = u.id
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_display_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_unique_username(TEXT) TO authenticated;

-- Backfill display_name for existing profiles that don't have it
UPDATE public.profiles p
SET display_name = COALESCE(
  p.display_name,
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'name',
  split_part(u.email, '@', 1),
  p.username,
  'User'
)
FROM auth.users u
WHERE p.id = u.id
AND (p.display_name IS NULL OR p.display_name = '');

-- Ensure all profiles have unique usernames (fix any duplicates)
DO $$
DECLARE
  dup_record RECORD;
  new_username TEXT;
BEGIN
  -- Find any duplicate usernames
  FOR dup_record IN 
    SELECT username, array_agg(id ORDER BY created_at) as user_ids
    FROM public.profiles
    GROUP BY username
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the first user, update the rest
    FOR i IN 2..array_length(dup_record.user_ids, 1) LOOP
      -- Generate a new unique username for duplicate
      SELECT dup_record.username || '_' || substr(md5(dup_record.user_ids[i]::text), 1, 8)
      INTO new_username;
      
      UPDATE public.profiles
      SET username = new_username
      WHERE id = dup_record.user_ids[i];
    END LOOP;
  END LOOP;
END $$;

-- Create index on username for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Verification queries
DO $$
DECLARE
  total_users INTEGER;
  unique_usernames INTEGER;
  profiles_with_display_names INTEGER;
  duplicate_usernames INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.profiles;
  SELECT COUNT(DISTINCT username) INTO unique_usernames FROM public.profiles;
  SELECT COUNT(*) INTO profiles_with_display_names 
  FROM public.profiles 
  WHERE display_name IS NOT NULL AND display_name != '';
  
  SELECT COUNT(*) INTO duplicate_usernames
  FROM (
    SELECT username FROM public.profiles
    GROUP BY username
    HAVING COUNT(*) > 1
  ) dups;
  
  RAISE NOTICE 'Email-Based Signup Migration Results:';
  RAISE NOTICE '  Total profiles: %', total_users;
  RAISE NOTICE '  Unique usernames: %', unique_usernames;
  RAISE NOTICE '  Profiles with display names: %', profiles_with_display_names;
  RAISE NOTICE '  Duplicate usernames: %', duplicate_usernames;
  
  IF duplicate_usernames > 0 THEN
    RAISE WARNING 'Found % duplicate usernames!', duplicate_usernames;
  ELSE
    RAISE NOTICE '  ✅ All usernames are unique';
  END IF;
  
  IF profiles_with_display_names < total_users THEN
    RAISE WARNING 'Some profiles missing display names: %', total_users - profiles_with_display_names;
  ELSE
    RAISE NOTICE '  ✅ All profiles have display names';
  END IF;
END $$;

-- Comments for documentation
COMMENT ON FUNCTION public.generate_unique_username(TEXT) IS 
'Generates a unique username from an email address by extracting the part before @, 
replacing non-alphanumeric characters with underscores, and appending numbers if needed 
to ensure uniqueness.';

COMMENT ON FUNCTION public.get_user_display_info(UUID) IS 
'Returns display information for a user including email, display name, avatar, 
referral code, and current equity balance. Used for UI display purposes.';

COMMENT ON COLUMN public.profiles.username IS 
'Auto-generated unique identifier from email address. Internal use only, not shown to users.';

COMMENT ON COLUMN public.profiles.display_name IS 
'User-provided full name or display name shown throughout the application.';