-- Fix for get_user_display_info function type mismatch
-- Run this if you get: "structure of query does not match function result type"

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_user_display_info(UUID);

-- Recreate with proper type casting
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
    )::DECIMAL(18, 8) as current_balance
  FROM auth.users u
  INNER JOIN public.profiles p ON p.id = u.id
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_display_info(UUID) TO authenticated;

-- Test the function works
DO $$
DECLARE
  test_user_id UUID;
  test_result RECORD;
BEGIN
  -- Get a test user ID (if exists)
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Try to call the function
    SELECT * INTO test_result FROM public.get_user_display_info(test_user_id);
    RAISE NOTICE '✅ Function get_user_display_info is working correctly';
  ELSE
    RAISE NOTICE '⚠️ No users found to test with, but function created successfully';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Error testing function: %', SQLERRM;
END $$;