-- Verification Queries for Profile and Equity System
-- Run these queries after applying the fix migration

-- 1. Check overall system health
SELECT 
  'Total Users' as metric,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Users with Profiles' as metric,
  COUNT(*) as count
FROM public.profiles
UNION ALL
SELECT 
  'Users with Equity' as metric,
  COUNT(DISTINCT user_id) as count
FROM public.equity_transactions
UNION ALL
SELECT 
  'Users with Signup Bonus' as metric,
  COUNT(DISTINCT et.user_id) as count
FROM public.equity_transactions et
INNER JOIN public.user_interactions ui ON et.interaction_id = ui.id
WHERE ui.action_type = 'signup';

-- 2. Find users missing profiles
SELECT 
  u.id,
  u.email,
  u.created_at,
  'Missing Profile' as issue
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 3. Find users missing signup bonus
SELECT 
  p.id,
  p.username,
  p.created_at,
  'Missing Signup Bonus' as issue
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.equity_transactions et
  INNER JOIN public.user_interactions ui ON et.interaction_id = ui.id
  WHERE et.user_id = p.id 
  AND ui.action_type = 'signup'
);

-- 4. Check user balances
SELECT 
  p.username,
  p.display_name,
  COALESCE(SUM(
    CASE 
      WHEN et.transaction_type = 'credit' THEN et.amount
      WHEN et.transaction_type = 'debit' THEN -et.amount
    END
  ), 0) as balance,
  COUNT(et.id) as transaction_count,
  MAX(et.created_at) as last_transaction
FROM public.profiles p
LEFT JOIN public.equity_transactions et ON et.user_id = p.id
GROUP BY p.id, p.username, p.display_name
ORDER BY balance DESC;

-- 5. Check referral relationships
SELECT 
  referrer.username as referrer_username,
  referred.username as referred_username,
  r.status,
  r.created_at,
  r.completed_at
FROM public.referrals r
INNER JOIN public.profiles referrer ON r.referrer_id = referrer.id
INNER JOIN public.profiles referred ON r.referred_id = referred.id
ORDER BY r.created_at DESC;

-- 6. Check recent equity transactions
SELECT 
  p.username,
  ui.action_type,
  et.amount,
  et.transaction_type,
  et.balance_after,
  et.description,
  et.created_at
FROM public.equity_transactions et
INNER JOIN public.profiles p ON et.user_id = p.id
LEFT JOIN public.user_interactions ui ON et.interaction_id = ui.id
ORDER BY et.created_at DESC
LIMIT 20;

-- 7. Verify trigger is working (check after creating a new test user)
-- This query shows the most recent user and their profile/equity status
WITH recent_user AS (
  SELECT 
    u.id,
    u.email,
    u.created_at,
    u.raw_user_meta_data
  FROM auth.users u
  ORDER BY u.created_at DESC
  LIMIT 1
)
SELECT 
  ru.email,
  ru.created_at as user_created,
  p.username,
  p.display_name,
  p.created_at as profile_created,
  COALESCE(SUM(
    CASE 
      WHEN et.transaction_type = 'credit' THEN et.amount
      WHEN et.transaction_type = 'debit' THEN -et.amount
    END
  ), 0) as balance,
  COUNT(et.id) as transactions
FROM recent_user ru
LEFT JOIN public.profiles p ON p.id = ru.id
LEFT JOIN public.equity_transactions et ON et.user_id = ru.id
GROUP BY ru.email, ru.created_at, p.username, p.display_name, p.created_at;

-- 8. Function to fix a specific user (call with user ID)
-- Example: SELECT * FROM public.fix_user_profile_and_equity('user-uuid-here');

-- 9. Check for any errors in user_interactions with duplicate request_ids
SELECT 
  request_id,
  COUNT(*) as duplicate_count
FROM public.user_interactions
WHERE request_id IS NOT NULL
GROUP BY request_id
HAVING COUNT(*) > 1;

-- 10. Summary report
WITH summary AS (
  SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM public.profiles) as total_profiles,
    (SELECT COUNT(DISTINCT user_id) FROM public.equity_transactions) as users_with_equity,
    (SELECT COUNT(DISTINCT et.user_id) 
     FROM public.equity_transactions et
     INNER JOIN public.user_interactions ui ON et.interaction_id = ui.id
     WHERE ui.action_type = 'signup') as users_with_signup_bonus,
    (SELECT COUNT(*) FROM public.referrals WHERE status = 'completed') as completed_referrals
)
SELECT 
  total_users,
  total_profiles,
  CASE 
    WHEN total_users = total_profiles THEN '✅ All users have profiles'
    ELSE '❌ ' || (total_users - total_profiles)::text || ' users missing profiles'
  END as profile_status,
  users_with_equity,
  CASE 
    WHEN total_profiles = users_with_signup_bonus THEN '✅ All users have signup bonus'
    ELSE '⚠️ ' || (total_profiles - users_with_signup_bonus)::text || ' users missing signup bonus'
  END as bonus_status,
  completed_referrals
FROM summary;