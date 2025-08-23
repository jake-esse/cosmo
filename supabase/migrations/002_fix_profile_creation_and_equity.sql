-- Migration: Fix Profile Creation and Equity Award System
-- Date: 2025-08-22
-- Purpose: Fix handle_new_user trigger, create missing profiles, and award missing signup bonuses

-- Drop existing trigger to recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Fix handle_new_user function to properly read metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile with proper metadata access
  INSERT INTO public.profiles (
    id, 
    username, 
    display_name,
    avatar_url,
    referred_by
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'user_name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NULL -- Will be updated below if referral code exists
  );
  
  -- Handle referral if provided
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    DECLARE
      v_referrer_id UUID;
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
    END;
  END IF;
  
  -- Award signup bonus (100 points)
  PERFORM public.award_equity_points(
    NEW.id,
    'signup'::action_type,
    100,
    'signup_' || NEW.id::text,
    'Welcome bonus for joining Cosmo'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    
    -- Still create a basic profile to not block the user
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (
      NEW.id, 
      COALESCE(split_part(NEW.email, '@', 1), 'user_' || substr(NEW.id::text, 1, 8)),
      COALESCE(split_part(NEW.email, '@', 1), 'User')
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Try to award signup bonus even if error occurred
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

-- Create profiles for existing users without profiles
INSERT INTO public.profiles (
  id, 
  username, 
  display_name,
  avatar_url
)
SELECT 
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'username',
    u.raw_user_meta_data->>'user_name',
    split_part(u.email, '@', 1),
    'user_' || substr(u.id::text, 1, 8)
  ),
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'display_name',
    split_part(u.email, '@', 1),
    'User'
  ),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Handle referrals for retroactively created profiles
DO $$
DECLARE
  user_record RECORD;
  v_referrer_id UUID;
BEGIN
  FOR user_record IN 
    SELECT 
      u.id,
      u.raw_user_meta_data->>'referral_code' as referral_code
    FROM auth.users u
    INNER JOIN public.profiles p ON p.id = u.id
    WHERE u.raw_user_meta_data->>'referral_code' IS NOT NULL
    AND p.referred_by IS NULL
  LOOP
    -- Find the referrer
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = user_record.referral_code
    AND id != user_record.id
    LIMIT 1;
    
    IF v_referrer_id IS NOT NULL THEN
      -- Update the referred_by field
      UPDATE public.profiles 
      SET referred_by = v_referrer_id
      WHERE id = user_record.id;
      
      -- Create referral record if it doesn't exist
      INSERT INTO public.referrals (
        referrer_id, 
        referred_id, 
        referral_code, 
        status
      )
      VALUES (
        v_referrer_id, 
        user_record.id, 
        user_record.referral_code, 
        'pending'
      )
      ON CONFLICT (referred_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Award signup bonus for users who don't have it yet
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN 
    SELECT p.id 
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 
      FROM public.equity_transactions et
      INNER JOIN public.user_interactions ui ON et.interaction_id = ui.id
      WHERE et.user_id = p.id 
      AND ui.action_type = 'signup'
    )
  LOOP
    BEGIN
      PERFORM public.award_equity_points(
        profile_record.id,
        'signup'::action_type,
        100,
        'retroactive_signup_' || profile_record.id::text,
        'Welcome bonus for joining Cosmo'
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Could not award retroactive signup bonus for user %: %', profile_record.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- Create a function to manually fix a user's profile and equity
CREATE OR REPLACE FUNCTION public.fix_user_profile_and_equity(p_user_id UUID)
RETURNS TABLE (
  profile_created BOOLEAN,
  equity_awarded BOOLEAN,
  current_balance DECIMAL(18, 8)
) AS $$
DECLARE
  v_profile_exists BOOLEAN;
  v_equity_exists BOOLEAN;
  v_balance DECIMAL(18, 8);
BEGIN
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_profile_exists;
  
  -- Create profile if missing
  IF NOT v_profile_exists THEN
    INSERT INTO public.profiles (id, username, display_name)
    SELECT 
      id,
      COALESCE(
        raw_user_meta_data->>'username',
        raw_user_meta_data->>'user_name',
        split_part(email, '@', 1),
        'user_' || substr(id::text, 1, 8)
      ),
      COALESCE(
        raw_user_meta_data->>'full_name',
        raw_user_meta_data->>'name',
        split_part(email, '@', 1),
        'User'
      )
    FROM auth.users
    WHERE id = p_user_id;
    
    v_profile_exists := TRUE;
  END IF;
  
  -- Check if signup bonus exists
  SELECT EXISTS(
    SELECT 1 
    FROM public.equity_transactions et
    INNER JOIN public.user_interactions ui ON et.interaction_id = ui.id
    WHERE et.user_id = p_user_id 
    AND ui.action_type = 'signup'
  ) INTO v_equity_exists;
  
  -- Award signup bonus if missing
  IF NOT v_equity_exists THEN
    PERFORM public.award_equity_points(
      p_user_id,
      'signup'::action_type,
      100,
      'manual_fix_signup_' || p_user_id::text,
      'Welcome bonus for joining Cosmo'
    );
    v_equity_exists := TRUE;
  END IF;
  
  -- Get current balance
  SELECT COALESCE(SUM(
    CASE 
      WHEN transaction_type = 'credit' THEN amount
      WHEN transaction_type = 'debit' THEN -amount
    END
  ), 0) INTO v_balance
  FROM public.equity_transactions
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT v_profile_exists, v_equity_exists, v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification: Count users with profiles and equity
DO $$
DECLARE
  total_users INTEGER;
  users_with_profiles INTEGER;
  users_with_equity INTEGER;
  users_with_signup_bonus INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM auth.users;
  SELECT COUNT(*) INTO users_with_profiles FROM public.profiles;
  SELECT COUNT(DISTINCT user_id) INTO users_with_equity FROM public.equity_transactions;
  SELECT COUNT(DISTINCT et.user_id) INTO users_with_signup_bonus
  FROM public.equity_transactions et
  INNER JOIN public.user_interactions ui ON et.interaction_id = ui.id
  WHERE ui.action_type = 'signup';
  
  RAISE NOTICE 'Profile and Equity Status:';
  RAISE NOTICE '  Total auth.users: %', total_users;
  RAISE NOTICE '  Users with profiles: %', users_with_profiles;
  RAISE NOTICE '  Users with equity: %', users_with_equity;
  RAISE NOTICE '  Users with signup bonus: %', users_with_signup_bonus;
  
  IF total_users != users_with_profiles THEN
    RAISE WARNING 'Not all users have profiles! Missing: %', total_users - users_with_profiles;
  END IF;
  
  IF users_with_profiles != users_with_signup_bonus THEN
    RAISE WARNING 'Not all users have signup bonus! Missing: %', users_with_profiles - users_with_signup_bonus;
  END IF;
END $$;

-- Grant necessary permissions for the fix function
GRANT EXECUTE ON FUNCTION public.fix_user_profile_and_equity(UUID) TO authenticated;