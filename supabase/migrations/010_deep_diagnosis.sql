-- Deep diagnostic queries to find the exact signup error
-- Run each section separately to identify the issue

-- SECTION 1: Check if trigger and functions exist and are enabled
SELECT '=== TRIGGER AND FUNCTION STATUS ===' as section;

SELECT 
  'Trigger Status' as check_type,
  tgname as name,
  CASE tgenabled 
    WHEN 'O' THEN '✅ ENABLED'
    WHEN 'D' THEN '❌ DISABLED'
    WHEN 'R' THEN '⚠️ REPLICA ONLY'
    WHEN 'A' THEN '⚠️ ALWAYS'
    ELSE '❌ UNKNOWN: ' || tgenabled
  END as status,
  tgisinternal as is_internal
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

SELECT 
  'Function Status' as check_type,
  proname as name,
  pronargs as arg_count,
  CASE 
    WHEN proname IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM pg_proc 
WHERE proname IN ('handle_new_user', 'generate_unique_username', 'award_equity_points');

-- SECTION 2: Test the generate_unique_username function with edge cases
SELECT '=== USERNAME GENERATION TEST ===' as section;

DO $$
DECLARE
  test_result TEXT;
  error_msg TEXT;
BEGIN
  -- Test various email formats
  BEGIN
    test_result := public.generate_unique_username('test@example.com');
    RAISE NOTICE '✅ test@example.com -> %', test_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ Failed for test@example.com: %', SQLERRM;
  END;
  
  BEGIN
    test_result := public.generate_unique_username('123@example.com');
    RAISE NOTICE '✅ 123@example.com -> %', test_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ Failed for 123@example.com: %', SQLERRM;
  END;
  
  BEGIN
    test_result := public.generate_unique_username('user.name+tag@example.com');
    RAISE NOTICE '✅ user.name+tag@example.com -> %', test_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ Failed for user.name+tag@example.com: %', SQLERRM;
  END;
  
  -- Test with NULL
  BEGIN
    test_result := public.generate_unique_username(NULL);
    RAISE WARNING '⚠️ NULL email generated: %', test_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✅ NULL email properly rejected: %', SQLERRM;
  END;
END $$;

-- SECTION 3: Check table constraints that might block inserts
SELECT '=== TABLE CONSTRAINTS ===' as section;

SELECT 
  c.conname as constraint_name,
  CASE c.contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'f' THEN 'FOREIGN KEY'
    ELSE c.contype::text
  END as type,
  pg_get_constraintdef(c.oid) as definition
FROM pg_constraint c
WHERE c.conrelid = 'public.profiles'::regclass
ORDER BY c.contype, c.conname;

-- SECTION 4: Check column properties
SELECT '=== COLUMN PROPERTIES ===' as section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN is_nullable = 'NO' AND column_default IS NULL THEN '⚠️ NOT NULL, no default'
    WHEN is_nullable = 'NO' AND column_default IS NOT NULL THEN '✅ NOT NULL with default'
    ELSE '✅ Nullable'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- SECTION 5: Test direct profile creation
SELECT '=== DIRECT INSERT TEST ===' as section;

DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_username TEXT := 'test_' || substr(md5(random()::text), 1, 8);
  test_code TEXT := upper(substr(md5(random()::text), 1, 8));
  error_detail TEXT;
  error_hint TEXT;
  error_context TEXT;
BEGIN
  -- Try to insert directly into profiles
  BEGIN
    INSERT INTO public.profiles (
      id,
      username,
      display_name,
      referral_code
    ) VALUES (
      test_id,
      test_username,
      'Direct Test User',
      test_code
    );
    
    -- If successful, clean up
    DELETE FROM public.profiles WHERE id = test_id;
    RAISE NOTICE '✅ Direct insert successful (cleaned up)';
    
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS 
      error_detail = PG_EXCEPTION_DETAIL,
      error_hint = PG_EXCEPTION_HINT,
      error_context = PG_EXCEPTION_CONTEXT;
    
    RAISE WARNING '❌ Direct insert failed';
    RAISE WARNING '  Error: %', SQLERRM;
    RAISE WARNING '  State: %', SQLSTATE;
    RAISE WARNING '  Detail: %', error_detail;
    RAISE WARNING '  Hint: %', error_hint;
    RAISE WARNING '  Context: %', error_context;
  END;
END $$;

-- SECTION 6: Simulate the full trigger execution
SELECT '=== SIMULATED TRIGGER TEST ===' as section;

DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'simulated_' || substr(md5(random()::text), 1, 8) || '@test.com';
  v_username TEXT;
  v_display_name TEXT;
  v_referral_code TEXT;
  v_retry_count INTEGER := 0;
  error_detail TEXT;
  error_hint TEXT;
BEGIN
  RAISE NOTICE 'Testing with email: %', test_email;
  
  -- Step 1: Generate username
  BEGIN
    v_username := public.generate_unique_username(test_email);
    RAISE NOTICE '  ✅ Username generated: %', v_username;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '  ❌ Username generation failed: %', SQLERRM;
    RETURN;
  END;
  
  -- Step 2: Set display name
  v_display_name := 'Test User';
  RAISE NOTICE '  ✅ Display name set: %', v_display_name;
  
  -- Step 3: Generate referral code
  <<referral_code_loop>>
  LOOP
    v_referral_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code) THEN
      RAISE NOTICE '  ✅ Referral code generated: %', v_referral_code;
      EXIT referral_code_loop;
    END IF;
    
    v_retry_count := v_retry_count + 1;
    IF v_retry_count > 10 THEN
      v_referral_code := upper(substr(replace(test_id::text, '-', ''), 1, 8));
      RAISE NOTICE '  ⚠️ Using fallback referral code: %', v_referral_code;
      EXIT referral_code_loop;
    END IF;
  END LOOP;
  
  -- Step 4: Try to insert
  BEGIN
    INSERT INTO public.profiles (
      id,
      username,
      display_name,
      referral_code
    ) VALUES (
      test_id,
      v_username,
      v_display_name,
      v_referral_code
    );
    
    -- If successful, clean up
    DELETE FROM public.profiles WHERE id = test_id;
    RAISE NOTICE '✅ SIMULATION SUCCESSFUL - Profile can be created';
    
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS 
      error_detail = PG_EXCEPTION_DETAIL,
      error_hint = PG_EXCEPTION_HINT;
    
    RAISE WARNING '❌ SIMULATION FAILED - This is likely your error:';
    RAISE WARNING '  Error: %', SQLERRM;
    RAISE WARNING '  State: %', SQLSTATE;
    RAISE WARNING '  Detail: %', error_detail;
    RAISE WARNING '  Hint: %', error_hint;
  END;
END $$;

-- SECTION 7: Check for permission issues
SELECT '=== PERMISSIONS CHECK ===' as section;

SELECT 
  schemaname,
  tablename,
  tableowner,
  has_table_privilege('authenticated', schemaname||'.'||tablename, 'INSERT') as authenticated_can_insert,
  has_table_privilege('anon', schemaname||'.'||tablename, 'INSERT') as anon_can_insert,
  has_table_privilege('service_role', schemaname||'.'||tablename, 'INSERT') as service_role_can_insert
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'user_interactions', 'equity_transactions', 'referrals');

-- SECTION 8: Check RLS policies
SELECT '=== RLS POLICIES ===' as section;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY policyname;

-- SECTION 9: Check if the trigger is actually being called
SELECT '=== RECENT AUTH USERS WITHOUT PROFILES ===' as section;

SELECT 
  u.id,
  u.email,
  u.created_at,
  u.raw_user_meta_data->>'full_name' as full_name,
  u.email_confirmed_at,
  p.id as profile_id,
  CASE 
    WHEN p.id IS NULL THEN '❌ NO PROFILE - TRIGGER MAY NOT BE FIRING'
    ELSE '✅ Has profile'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.created_at > NOW() - INTERVAL '1 hour'
ORDER BY u.created_at DESC
LIMIT 10;

-- SECTION 10: Check for any blocking triggers or rules
SELECT '=== ALL TRIGGERS ON AUTH.USERS ===' as section;

SELECT 
  tgname as trigger_name,
  tgtype,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'auth.users'::regclass
ORDER BY tgname;

-- FINAL: Summary and recommendations
SELECT '=== DIAGNOSTIC SUMMARY ===' as section;

WITH checks AS (
  SELECT 
    (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'on_auth_user_created' AND tgenabled = 'O') as trigger_ok,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'handle_new_user') as function_ok,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'generate_unique_username') as username_gen_ok,
    (SELECT COUNT(*) FROM auth.users WHERE created_at > NOW() - INTERVAL '1 hour') as recent_users,
    (SELECT COUNT(*) FROM public.profiles p JOIN auth.users u ON p.id = u.id WHERE u.created_at > NOW() - INTERVAL '1 hour') as recent_profiles
)
SELECT 
  CASE 
    WHEN trigger_ok = 0 THEN '❌ PROBLEM: Trigger is disabled or missing'
    WHEN function_ok = 0 THEN '❌ PROBLEM: handle_new_user function missing'
    WHEN username_gen_ok = 0 THEN '❌ PROBLEM: generate_unique_username function missing'
    WHEN recent_users > 0 AND recent_profiles = 0 THEN '❌ PROBLEM: Trigger is not creating profiles'
    WHEN recent_users = 0 THEN '⚠️ No recent signups to analyze'
    ELSE '✅ Basic checks passed - check detailed output above for specific errors'
  END as diagnosis
FROM checks;