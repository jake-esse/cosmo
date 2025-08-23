-- Diagnostic queries to identify "Database error saving new user" issue
-- Run these queries to understand what's failing

-- 1. Check if the trigger exists and is enabled
SELECT 
  tgname as trigger_name,
  tgenabled as is_enabled,
  tgisinternal as is_internal
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 2. Check recent errors in PostgreSQL logs (if accessible)
-- This shows any recent function errors
SELECT 
  'Check Supabase Dashboard > Logs > Postgres Logs for recent errors' as instruction;

-- 3. Test the generate_unique_username function directly
DO $$
DECLARE
  test_username TEXT;
BEGIN
  -- Test with various email formats
  test_username := public.generate_unique_username('test@example.com');
  RAISE NOTICE 'Generated username for test@example.com: %', test_username;
  
  test_username := public.generate_unique_username('test.user@example.com');
  RAISE NOTICE 'Generated username for test.user@example.com: %', test_username;
  
  test_username := public.generate_unique_username('123@example.com');
  RAISE NOTICE 'Generated username for 123@example.com: %', test_username;
  
  RAISE NOTICE '✅ generate_unique_username function is working';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Error in generate_unique_username: %', SQLERRM;
END $$;

-- 4. Check if there are any constraint violations on the profiles table
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass;

-- 5. Check for any duplicate usernames that might cause issues
SELECT 
  username,
  COUNT(*) as count
FROM public.profiles
GROUP BY username
HAVING COUNT(*) > 1;

-- 6. Check if referral_code is properly set for all profiles
SELECT 
  COUNT(*) as total_profiles,
  COUNT(referral_code) as profiles_with_referral_code,
  COUNT(*) - COUNT(referral_code) as missing_referral_codes
FROM public.profiles;

-- 7. Look for any profiles with NULL or empty critical fields
SELECT 
  id,
  username,
  display_name,
  referral_code,
  created_at,
  CASE
    WHEN username IS NULL THEN 'NULL username'
    WHEN username = '' THEN 'Empty username'
    WHEN referral_code IS NULL THEN 'NULL referral_code'
    WHEN referral_code = '' THEN 'Empty referral_code'
    ELSE 'Check other fields'
  END as issue
FROM public.profiles
WHERE username IS NULL 
   OR username = ''
   OR referral_code IS NULL
   OR referral_code = '';

-- 8. Test if the handle_new_user function has proper error handling
-- Let's check the function definition
SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc 
WHERE proname = 'handle_new_user'
LIMIT 1;

-- 9. Check if there are recent users without profiles (indicating trigger failure)
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.raw_user_meta_data->>'full_name' as full_name,
  p.id as profile_id,
  CASE 
    WHEN p.id IS NULL THEN '❌ Missing Profile'
    ELSE '✅ Has Profile'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.created_at > NOW() - INTERVAL '1 day'
ORDER BY u.created_at DESC;

-- 10. Check the actual error by attempting to create a test profile
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_username TEXT;
  test_referral_code TEXT;
BEGIN
  -- Generate test data
  test_username := 'test_' || substr(test_id::text, 1, 8);
  test_referral_code := upper(substr(replace(test_id::text, '-', ''), 1, 8));
  
  -- Try to insert a test profile
  BEGIN
    INSERT INTO public.profiles (
      id,
      username,
      display_name,
      referral_code
    ) VALUES (
      test_id,
      test_username,
      'Test User',
      test_referral_code
    );
    
    -- If successful, delete it
    DELETE FROM public.profiles WHERE id = test_id;
    RAISE NOTICE '✅ Can create profiles successfully';
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '❌ Error creating profile: %', SQLERRM;
      RAISE WARNING 'Error detail: %', SQLSTATE;
  END;
END $$;