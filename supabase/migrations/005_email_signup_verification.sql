-- Verification Queries for Email-Based Signup System
-- Run these queries after applying migration 004

-- 1. Check username uniqueness and display name coverage
SELECT 
  'System Health Check' as category,
  'Total Profiles' as metric,
  COUNT(*) as value
FROM public.profiles
UNION ALL
SELECT 
  'System Health Check' as category,
  'Unique Usernames' as metric,
  COUNT(DISTINCT username) as value
FROM public.profiles
UNION ALL
SELECT 
  'System Health Check' as category,
  'Profiles with Display Names' as metric,
  COUNT(*) as value
FROM public.profiles
WHERE display_name IS NOT NULL AND display_name != ''
UNION ALL
SELECT 
  'System Health Check' as category,
  'Duplicate Usernames' as metric,
  COUNT(*) as value
FROM (
  SELECT username 
  FROM public.profiles
  GROUP BY username
  HAVING COUNT(*) > 1
) dups;

-- 2. Find any profiles with problematic usernames
SELECT 
  id,
  username,
  display_name,
  created_at,
  CASE
    WHEN username IS NULL THEN 'NULL username'
    WHEN username = '' THEN 'Empty username'
    WHEN username ~ '^[0-9]' THEN 'Starts with number (should have user_ prefix)'
    WHEN length(username) < 3 THEN 'Too short'
    ELSE 'OK'
  END as username_status
FROM public.profiles
WHERE username IS NULL 
   OR username = ''
   OR username ~ '^[0-9]'
   OR length(username) < 3
LIMIT 20;

-- 3. Test the username generation function with various email formats
SELECT 
  email,
  public.generate_unique_username(email) as generated_username
FROM (VALUES 
  ('john.doe@example.com'),
  ('123user@example.com'),
  ('test+tag@example.com'),
  ('admin@example.com'),
  ('user@example.com'),
  ('hello-world@example.com'),
  ('first.last@example.com'),
  ('test123@example.com'),
  ('9999@example.com'),
  ('@example.com')
) AS test_emails(email);

-- 4. Check recent user signups to verify the new system is working
WITH recent_users AS (
  SELECT 
    u.id,
    u.email,
    u.created_at,
    u.raw_user_meta_data->>'full_name' as meta_full_name,
    u.raw_user_meta_data->>'display_name' as meta_display_name,
    u.raw_user_meta_data->>'username' as meta_username
  FROM auth.users u
  ORDER BY u.created_at DESC
  LIMIT 10
)
SELECT 
  ru.email,
  ru.created_at as signup_date,
  p.username,
  p.display_name,
  ru.meta_full_name as provided_full_name,
  CASE 
    WHEN p.id IS NULL THEN '❌ Missing Profile'
    WHEN p.display_name IS NULL OR p.display_name = '' THEN '⚠️ Missing Display Name'
    ELSE '✅ Complete'
  END as status,
  COALESCE(eb.balance, 0) as equity_balance
FROM recent_users ru
LEFT JOIN public.profiles p ON p.id = ru.id
LEFT JOIN LATERAL (
  SELECT SUM(
    CASE 
      WHEN et.transaction_type = 'credit' THEN et.amount
      WHEN et.transaction_type = 'debit' THEN -et.amount
    END
  ) as balance
  FROM public.equity_transactions et
  WHERE et.user_id = ru.id
) eb ON true;

-- 5. Test the get_user_display_info function (skip if function has type issues)
-- If this fails with type mismatch, run 006_fix_display_info_function.sql first
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  SELECT id INTO test_user_id FROM public.profiles ORDER BY created_at DESC LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    BEGIN
      PERFORM * FROM public.get_user_display_info(test_user_id);
      RAISE NOTICE '✅ get_user_display_info function is working';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '❌ get_user_display_info function error: %. Run 006_fix_display_info_function.sql to fix.', SQLERRM;
    END;
  ELSE
    RAISE NOTICE '⚠️ No users found to test get_user_display_info function';
  END IF;
END $$;

-- 6. Verify all users have signup bonuses
WITH user_bonuses AS (
  SELECT 
    p.id,
    p.username,
    p.display_name,
    EXISTS(
      SELECT 1 
      FROM public.equity_transactions et
      INNER JOIN public.user_interactions ui ON et.interaction_id = ui.id
      WHERE et.user_id = p.id 
      AND ui.action_type = 'signup'
      AND et.amount = 100
    ) as has_signup_bonus
  FROM public.profiles p
)
SELECT 
  'Signup Bonus Coverage' as category,
  CASE 
    WHEN has_signup_bonus THEN 'Has Bonus'
    ELSE 'Missing Bonus'
  END as status,
  COUNT(*) as count
FROM user_bonuses
GROUP BY has_signup_bonus;

-- 7. Check for any username collisions that might occur
WITH username_patterns AS (
  SELECT 
    substring(username from '^[^_0-9]+') as base_pattern,
    COUNT(*) as pattern_count,
    array_agg(username ORDER BY username) as usernames
  FROM public.profiles
  WHERE username IS NOT NULL
  GROUP BY substring(username from '^[^_0-9]+')
  HAVING COUNT(*) > 1
)
SELECT 
  base_pattern,
  pattern_count,
  usernames[1:5] as sample_usernames -- Show first 5 examples
FROM username_patterns
ORDER BY pattern_count DESC
LIMIT 10;

-- 8. Summary report
WITH stats AS (
  SELECT 
    (SELECT COUNT(*) FROM public.profiles) as total_profiles,
    (SELECT COUNT(DISTINCT username) FROM public.profiles) as unique_usernames,
    (SELECT COUNT(*) FROM public.profiles WHERE display_name IS NOT NULL AND display_name != '') as with_display_names,
    (SELECT COUNT(*) FROM (
      SELECT username FROM public.profiles
      GROUP BY username
      HAVING COUNT(*) > 1
    ) d) as duplicate_usernames,
    (SELECT COUNT(DISTINCT et.user_id)
     FROM public.equity_transactions et
     INNER JOIN public.user_interactions ui ON et.interaction_id = ui.id
     WHERE ui.action_type = 'signup') as users_with_signup_bonus
)
SELECT 
  '=== EMAIL-BASED SIGNUP VERIFICATION REPORT ===' as report,
  '' as value
UNION ALL
SELECT 
  'Total Profiles',
  total_profiles::text
FROM stats
UNION ALL
SELECT 
  'Unique Username Check',
  CASE 
    WHEN unique_usernames = total_profiles THEN '✅ PASS - All usernames unique'
    ELSE '❌ FAIL - ' || duplicate_usernames::text || ' duplicates found'
  END
FROM stats
UNION ALL
SELECT 
  'Display Name Coverage',
  CASE 
    WHEN with_display_names = total_profiles THEN '✅ PASS - All have display names'
    ELSE '⚠️ WARNING - ' || (total_profiles - with_display_names)::text || ' missing display names'
  END
FROM stats
UNION ALL
SELECT 
  'Signup Bonus Coverage',
  CASE 
    WHEN users_with_signup_bonus = total_profiles THEN '✅ PASS - All have signup bonus'
    ELSE '⚠️ WARNING - ' || (total_profiles - users_with_signup_bonus)::text || ' missing bonuses'
  END
FROM stats
UNION ALL
SELECT 
  '=== END OF REPORT ===',
  ''
FROM stats;