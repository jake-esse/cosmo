-- Migration: Fix referral completion function to use correct award_equity_points signature
-- Purpose: Fix the function that completes referrals to match the actual database schema
-- Author: Cosmo Platform Team
-- Date: 2025-08-25

-- Drop old versions that don't work
DROP FUNCTION IF EXISTS public.admin_complete_all_pending_referrals() CASCADE;
DROP FUNCTION IF EXISTS public.admin_force_complete_referral(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.admin_force_complete_all_referrals() CASCADE;
DROP FUNCTION IF EXISTS public.simple_complete_referral(uuid) CASCADE;

-- Create a working function to complete a single referral
CREATE OR REPLACE FUNCTION public.complete_single_referral(p_referral_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_referral record;
    v_request_id text;
    v_referrer_tx_id uuid;
    v_referred_tx_id uuid;
BEGIN
    -- Get the referral details
    SELECT * INTO v_referral
    FROM public.referrals
    WHERE id = p_referral_id
    AND status = 'pending';
    
    IF v_referral IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Referral not found or not pending');
    END IF;
    
    -- Update referral status
    UPDATE public.referrals
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = p_referral_id;
    
    -- Award points to referrer (50 points)
    v_request_id := 'ref_referrer_' || p_referral_id::text;
    v_referrer_tx_id := public.award_equity_points(
        p_user_id := v_referral.referrer_id,
        p_action_type := 'referral_completed'::action_type,
        p_amount := 50::numeric,
        p_request_id := v_request_id,
        p_description := 'Referral bonus for inviting a friend',
        p_app_id := NULL
    );
    
    -- Update referral with transaction ID
    UPDATE public.referrals
    SET referrer_reward_transaction_id = v_referrer_tx_id
    WHERE id = p_referral_id;
    
    -- Award points to referred user (25 points)
    v_request_id := 'ref_referred_' || p_referral_id::text;
    v_referred_tx_id := public.award_equity_points(
        p_user_id := v_referral.referred_id,
        p_action_type := 'referral_completed'::action_type,
        p_amount := 25::numeric,
        p_request_id := v_request_id,
        p_description := 'Welcome bonus for joining via referral',
        p_app_id := NULL
    );
    
    -- Update referral with transaction ID
    UPDATE public.referrals
    SET referred_reward_transaction_id = v_referred_tx_id
    WHERE id = p_referral_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'referral_id', p_referral_id,
        'referrer_tx', v_referrer_tx_id,
        'referred_tx', v_referred_tx_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'reason', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin function to complete ALL pending referrals
CREATE OR REPLACE FUNCTION public.admin_complete_all_pending_referrals()
RETURNS jsonb AS $$
DECLARE
    v_referral record;
    v_count integer := 0;
    v_errors integer := 0;
    v_results jsonb[] := ARRAY[]::jsonb[];
    v_result jsonb;
BEGIN
    -- Process ALL pending referrals
    FOR v_referral IN 
        SELECT * FROM public.referrals
        WHERE status = 'pending'
        ORDER BY created_at
    LOOP
        -- Try to complete this referral
        SELECT public.complete_single_referral(v_referral.id) INTO v_result;
        
        IF v_result->>'success' = 'true' THEN
            v_count := v_count + 1;
            RAISE NOTICE 'Completed referral %', v_referral.id;
        ELSE
            v_errors := v_errors + 1;
            RAISE WARNING 'Failed to complete referral %: %', v_referral.id, v_result->>'reason';
        END IF;
        
        v_results := array_append(v_results, v_result);
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'completed_count', v_count,
        'error_count', v_errors,
        'total_processed', v_count + v_errors,
        'message', format('Completed %s referrals with %s errors', v_count, v_errors),
        'details', to_jsonb(v_results)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simpler version for dashboard use
CREATE OR REPLACE FUNCTION public.complete_pending_referral_for_user(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_referral record;
    v_result jsonb;
BEGIN
    -- Check if user's email is verified
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = p_user_id 
        AND email_confirmed_at IS NOT NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Email not verified');
    END IF;
    
    -- Find pending referral for this user
    SELECT * INTO v_referral
    FROM public.referrals
    WHERE referred_id = p_user_id
    AND status = 'pending'
    LIMIT 1;
    
    IF v_referral IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'No pending referral');
    END IF;
    
    -- Complete the referral
    SELECT public.complete_single_referral(v_referral.id) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.complete_single_referral(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_complete_all_pending_referrals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_pending_referral_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_pending_referral_for_user(uuid) TO service_role;

-- Add comments
COMMENT ON FUNCTION public.complete_single_referral(uuid) IS 'Complete a single referral and award points';
COMMENT ON FUNCTION public.admin_complete_all_pending_referrals() IS 'Admin function to complete all pending referrals';
COMMENT ON FUNCTION public.complete_pending_referral_for_user(uuid) IS 'Complete pending referral for a specific user';

-- Test the function to show how many referrals can be completed
DO $$
DECLARE
    v_pending_count integer;
    v_verified_count integer;
BEGIN
    -- Count total pending
    SELECT COUNT(*) INTO v_pending_count
    FROM public.referrals
    WHERE status = 'pending';
    
    -- Count pending with verified emails
    SELECT COUNT(*) INTO v_verified_count
    FROM public.referrals r
    JOIN auth.users u ON u.id = r.referred_id
    WHERE r.status = 'pending'
    AND u.email_confirmed_at IS NOT NULL;
    
    RAISE NOTICE 'Found % pending referrals, % have verified emails and can be completed', 
        v_pending_count, v_verified_count;
END;
$$;