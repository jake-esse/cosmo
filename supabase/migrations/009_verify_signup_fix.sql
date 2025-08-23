-- Verification queries after fixing referral_code generation
-- Run these to ensure the signup system is working correctly

-- 1. System Health Check
WITH system_stats AS (
  SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM public.profiles) as total_profiles,
    (SELECT COUNT(*) FROM public.profiles WHERE referral_code IS NOT NULL) as profiles_with_codes,
    (SELECT COUNT(*) FROM public.profiles WHERE username IS NOT NULL) as profiles_with_usernames,
    (SELECT COUNT(*) FROM public.profiles WHERE display_name IS NOT NULL) as profiles_with_names,
    (SELECT COUNT(DISTINCT referral_code) FROM public.profiles WHERE referral_code IS NOT NULL) as unique_codes,
    (SELECT COUNT(DISTINCT username) FROM public.profiles WHERE username IS NOT NULL) as unique_usernames
)
SELECT 
  '=== SIGNUP SYSTEM HEALTH CHECK ===' as report,
  '' as status
UNION ALL
SELECT 'User to Profile Ratio', 
  CASE 
    WHEN total_users = total_profiles THEN '✅ PASS (' || total_users::text || ' = ' || total_profiles::text || ')'
    ELSE '❌ FAIL (' || total_users::text || ' users, ' || total_profiles::text || ' profiles)'
  END
FROM system_stats
UNION ALL
SELECT 'Referral Code Coverage',
  CASE 
    WHEN profiles_with_codes = total_profiles THEN '✅ PASS (100% have codes)'
    ELSE '❌ FAIL (' || profiles_with_codes::text || '/' || total_profiles::text || ' have codes)'
  END
FROM system_stats
UNION ALL
SELECT 'Referral Code Uniqueness',
  CASE 
    WHEN unique_codes = profiles_with_codes THEN '✅ PASS (all unique)'
    ELSE '❌ FAIL (' || (profiles_with_codes - unique_codes)::text || ' duplicates)'
  END
FROM system_stats
UNION ALL
SELECT 'Username Coverage',
  CASE 
    WHEN profiles_with_usernames = total_profiles THEN '✅ PASS (100% have usernames)'
    ELSE '❌ FAIL (' || profiles_with_usernames::text || '/' || total_profiles::text || ' have usernames)'
  END
FROM system_stats
UNION ALL
SELECT 'Username Uniqueness',
  CASE 
    WHEN unique_usernames = profiles_with_usernames THEN '✅ PASS (all unique)'
    ELSE '❌ FAIL (' || (profiles_with_usernames - unique_usernames)::text || ' duplicates)'
  END
FROM system_stats
UNION ALL
SELECT 'Display Name Coverage',
  CASE 
    WHEN profiles_with_names = total_profiles THEN '✅ PASS (100% have names)'
    ELSE '⚠️ WARNING (' || profiles_with_names::text || '/' || total_profiles::text || ' have names)'
  END
FROM system_stats;

-- 2. Find Problematic Profiles
SELECT 
  'Problematic Profiles' as category,
  id,
  username,
  display_name,
  referral_code,
  CASE
    WHEN username IS NULL THEN 'Missing username'
    WHEN referral_code IS NULL THEN 'Missing referral_code'
    WHEN display_name IS NULL THEN 'Missing display_name'
    ELSE 'Unknown issue'
  END as issue
FROM public.profiles
WHERE username IS NULL 
   OR referral_code IS NULL
   OR display_name IS NULL
LIMIT 10;

-- 3. Check for Duplicate Referral Codes
SELECT 
  'Duplicate Referral Codes' as category,
  referral_code,
  COUNT(*) as count,
  array_agg(id) as user_ids
FROM public.profiles
WHERE referral_code IS NOT NULL
GROUP BY referral_code
HAVING COUNT(*) > 1
LIMIT 10;

-- 4. Check Recent Signups
SELECT 
  'Recent Signups (Last 24 Hours)' as category,
  u.email,
  u.created_at,
  p.username,
  p.display_name,
  p.referral_code,
  CASE 
    WHEN p.id IS NULL THEN '❌ Missing Profile'
    WHEN p.referral_code IS NULL THEN '❌ Missing Referral Code'
    WHEN p.username IS NULL THEN '❌ Missing Username'
    ELSE '✅ Complete'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.created_at > NOW() - INTERVAL '24 hours'
ORDER BY u.created_at DESC
LIMIT 10;

-- 5. Test Referral Code Format
WITH code_analysis AS (
  SELECT 
    referral_code,
    length(referral_code) as code_length,
    CASE 
      WHEN referral_code ~ '^[A-Z0-9]{8}$' THEN 'Valid Format'
      WHEN referral_code ~ '^[a-z0-9]{8}$' THEN 'Lowercase (should be uppercase)'
      WHEN length(referral_code) != 8 THEN 'Wrong Length'
      ELSE 'Invalid Format'
    END as format_status
  FROM public.profiles
  WHERE referral_code IS NOT NULL
)
SELECT 
  format_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM code_analysis
GROUP BY format_status
ORDER BY count DESC;

-- 6. Check Equity Bonus Awards
WITH bonus_check AS (
  SELECT 
    p.id,
    p.username,
    p.created_at as profile_created,
    EXISTS(
      SELECT 1 
      FROM public.equity_transactions et
      INNER JOIN public.user_interactions ui ON et.interaction_id = ui.id
      WHERE et.user_id = p.id 
      AND ui.action_type = 'signup'
      AND et.amount = 100
    ) as has_signup_bonus,
    (
      SELECT SUM(
        CASE 
          WHEN et.transaction_type = 'credit' THEN et.amount
          WHEN et.transaction_type = 'debit' THEN -et.amount
        END
      )
      FROM public.equity_transactions et
      WHERE et.user_id = p.id
    ) as total_balance
  FROM public.profiles p
)
SELECT 
  'Signup Bonus Status' as category,
  COUNT(*) as total_profiles,
  SUM(CASE WHEN has_signup_bonus THEN 1 ELSE 0 END) as with_bonus,
  SUM(CASE WHEN NOT has_signup_bonus THEN 1 ELSE 0 END) as without_bonus,
  ROUND(AVG(COALESCE(total_balance, 0)), 2) as avg_balance
FROM bonus_check;

-- 7. Test the Complete Signup Flow
DO $$
DECLARE
  test_result BOOLEAN := true;
  test_message TEXT := '';
BEGIN
  -- Test 1: Check trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    test_result := false;
    test_message := test_message || '❌ Trigger missing; ';
  ELSE
    test_message := test_message || '✅ Trigger exists; ';
  END IF;
  
  -- Test 2: Check function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user'
  ) THEN
    test_result := false;
    test_message := test_message || '❌ Function missing; ';
  ELSE
    test_message := test_message || '✅ Function exists; ';
  END IF;
  
  -- Test 3: Check generate_unique_username exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'generate_unique_username'
  ) THEN
    test_result := false;
    test_message := test_message || '❌ Username generator missing; ';
  ELSE
    test_message := test_message || '✅ Username generator exists; ';
  END IF;
  
  -- Test 4: Check constraints
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_referral_code_key' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    test_result := false;
    test_message := test_message || '❌ Referral code unique constraint missing; ';
  ELSE
    test_message := test_message || '✅ Constraints OK; ';
  END IF;
  
  -- Final result
  IF test_result THEN
    RAISE NOTICE '✅ SIGNUP SYSTEM READY: %', test_message;
  ELSE
    RAISE WARNING '❌ SIGNUP SYSTEM ISSUES: %', test_message;
  END IF;
END $$;

-- 8. Summary Report
SELECT 
  '=== FINAL STATUS ===' as report,
  CASE 
    WHEN (
      SELECT COUNT(*) = COUNT(DISTINCT referral_code) 
      FROM public.profiles 
      WHERE referral_code IS NOT NULL
    ) AND (
      SELECT COUNT(*) = COUNT(DISTINCT username) 
      FROM public.profiles 
      WHERE username IS NOT NULL
    ) AND (
      SELECT COUNT(*) FROM auth.users
    ) = (
      SELECT COUNT(*) FROM public.profiles
    ) THEN '✅ SYSTEM READY FOR SIGNUPS'
    ELSE '❌ SYSTEM NEEDS ATTENTION'
  END as status;