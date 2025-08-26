-- Migration: Fix balance display functions
-- Purpose: Ensure balance functions return data in the correct format for the app
-- Author: Cosmo Platform Team
-- Date: 2025-08-25

-- Drop and recreate get_user_balance to ensure it works properly
DROP FUNCTION IF EXISTS public.get_user_balance(uuid);

CREATE OR REPLACE FUNCTION public.get_user_balance(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_total_balance numeric;
    v_total_earned numeric;
    v_total_spent numeric;
    v_transaction_count bigint;
    v_last_transaction_at timestamptz;
    v_referral_earnings numeric;
BEGIN
    -- Calculate total balance (sum of all transactions)
    SELECT 
        COALESCE(SUM(amount), 0) INTO v_total_balance
    FROM public.equity_transactions
    WHERE user_id = p_user_id;
    
    -- Calculate total earned (positive transactions)
    SELECT 
        COALESCE(SUM(amount), 0) INTO v_total_earned
    FROM public.equity_transactions
    WHERE user_id = p_user_id
    AND amount > 0;
    
    -- Calculate total spent (negative transactions) 
    SELECT 
        COALESCE(ABS(SUM(amount)), 0) INTO v_total_spent
    FROM public.equity_transactions
    WHERE user_id = p_user_id
    AND amount < 0;
    
    -- Get transaction count
    SELECT 
        COUNT(*) INTO v_transaction_count
    FROM public.equity_transactions
    WHERE user_id = p_user_id;
    
    -- Get last transaction date
    SELECT 
        MAX(created_at) INTO v_last_transaction_at
    FROM public.equity_transactions
    WHERE user_id = p_user_id;
    
    -- Calculate referral earnings specifically
    SELECT 
        COALESCE(SUM(amount), 0) INTO v_referral_earnings
    FROM public.equity_transactions
    WHERE user_id = p_user_id
    AND (description ILIKE '%referral%' OR description ILIKE '%invite%' OR description ILIKE '%friend%');
    
    -- Return as JSONB for consistent handling
    RETURN jsonb_build_object(
        'total_balance', v_total_balance,
        'total_earned', v_total_earned,
        'total_spent', v_total_spent,
        'transaction_count', v_transaction_count,
        'last_transaction_at', v_last_transaction_at,
        'referral_earnings', v_referral_earnings
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_balance(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_balance(uuid) TO anon;

-- Create a simple function to get referral stats for a user
CREATE OR REPLACE FUNCTION public.get_user_referral_stats(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_stats jsonb;
    v_total_referred integer;
    v_completed integer;
    v_pending integer;
    v_referral_earnings numeric;
    v_referral_code text;
BEGIN
    -- Get referral code
    SELECT referral_code INTO v_referral_code
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Count total referrals
    SELECT COUNT(*) INTO v_total_referred
    FROM public.referrals
    WHERE referrer_id = p_user_id;
    
    -- Count completed referrals
    SELECT COUNT(*) INTO v_completed
    FROM public.referrals
    WHERE referrer_id = p_user_id
    AND status = 'completed';
    
    -- Count pending referrals
    SELECT COUNT(*) INTO v_pending
    FROM public.referrals
    WHERE referrer_id = p_user_id
    AND status = 'pending';
    
    -- Calculate referral earnings
    SELECT COALESCE(SUM(amount), 0) INTO v_referral_earnings
    FROM public.equity_transactions
    WHERE user_id = p_user_id
    AND (description ILIKE '%referral%' OR description ILIKE '%invite%');
    
    RETURN jsonb_build_object(
        'referral_code', v_referral_code,
        'total_referred', v_total_referred,
        'completed_referrals', v_completed,
        'pending_referrals', v_pending,
        'referral_earnings', v_referral_earnings
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_referral_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_referral_stats(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_referral_stats(uuid) TO anon;

-- Add helpful comments
COMMENT ON FUNCTION public.get_user_balance(uuid) IS 
'Get complete balance information for a user including referral earnings';

COMMENT ON FUNCTION public.get_user_referral_stats(uuid) IS 
'Get referral statistics for a user including counts and earnings';

-- Test the functions to verify they work
DO $$
DECLARE
    v_test_user uuid;
    v_balance jsonb;
    v_stats jsonb;
BEGIN
    -- Get jake's user ID for testing
    SELECT id INTO v_test_user 
    FROM auth.users 
    WHERE email = 'jake@ampel.ai' 
    LIMIT 1;
    
    IF v_test_user IS NOT NULL THEN
        -- Test balance function
        SELECT public.get_user_balance(v_test_user) INTO v_balance;
        RAISE NOTICE 'Jake balance: %', v_balance;
        
        -- Test referral stats function
        SELECT public.get_user_referral_stats(v_test_user) INTO v_stats;
        RAISE NOTICE 'Jake referral stats: %', v_stats;
    END IF;
END;
$$;