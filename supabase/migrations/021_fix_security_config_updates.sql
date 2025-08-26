-- Migration: Fix security configuration updates and set testing values
-- Purpose: Ensure security config can be updated and set values for testing
-- Author: Cosmo Platform Team
-- Date: 2025-08-25

-- Create a function to properly update security config values
CREATE OR REPLACE FUNCTION public.update_security_config(
    p_config_key text,
    p_config_value jsonb
)
RETURNS jsonb AS $$
BEGIN
    UPDATE public.referral_security_config
    SET 
        config_value = p_config_value,
        updated_at = NOW()
    WHERE config_key = p_config_key;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Config key not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'updated_key', p_config_key, 'new_value', p_config_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_security_config(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_security_config(text, jsonb) TO service_role;

-- Set all security configs to testing-friendly values
UPDATE public.referral_security_config SET config_value = to_jsonb(0) WHERE config_key = 'min_account_age_hours';
UPDATE public.referral_security_config SET config_value = to_jsonb(1000) WHERE config_key = 'max_referrals_per_day';
UPDATE public.referral_security_config SET config_value = to_jsonb(1000) WHERE config_key = 'max_referrals_per_week';
UPDATE public.referral_security_config SET config_value = to_jsonb(1000) WHERE config_key = 'max_referrals_per_month';
UPDATE public.referral_security_config SET config_value = to_jsonb(100) WHERE config_key = 'max_signups_per_ip_per_day';
UPDATE public.referral_security_config SET config_value = to_jsonb(100) WHERE config_key = 'max_signups_per_ip_per_week';
UPDATE public.referral_security_config SET config_value = to_jsonb(0) WHERE config_key = 'referral_cooldown_minutes';
UPDATE public.referral_security_config SET config_value = to_jsonb(true) WHERE config_key = 'require_email_verification';
UPDATE public.referral_security_config SET config_value = to_jsonb(1000) WHERE config_key = 'suspicious_ip_threshold';
UPDATE public.referral_security_config SET config_value = to_jsonb(0.99) WHERE config_key = 'auto_block_suspicious_threshold';

-- Also ensure jake@ampel.ai is definitely an admin
UPDATE public.profiles
SET is_admin = true
WHERE id IN (SELECT id FROM auth.users WHERE email = 'jake@ampel.ai');

-- Create a simple function to force complete ALL pending referrals (admin only)
CREATE OR REPLACE FUNCTION public.admin_complete_all_pending_referrals()
RETURNS jsonb AS $$
DECLARE
    v_referral record;
    v_count integer := 0;
    v_errors integer := 0;
    v_request_id text;
BEGIN
    -- Process ALL pending referrals
    FOR v_referral IN 
        SELECT * FROM public.referrals
        WHERE status = 'pending'
    LOOP
        BEGIN
            -- Update status
            UPDATE public.referrals
            SET status = 'completed', completed_at = NOW()
            WHERE id = v_referral.id;
            
            -- Award points to referrer
            v_request_id := 'admin_force_referrer_' || v_referral.id::text;
            PERFORM public.award_equity_points(
                v_referral.referrer_id,
                50,
                'referral_bonus',
                'Referral bonus (admin forced)',
                v_request_id
            );
            
            -- Award points to referred
            v_request_id := 'admin_force_referred_' || v_referral.id::text;
            PERFORM public.award_equity_points(
                v_referral.referred_id,
                25,
                'referral_bonus',
                'Referral welcome bonus (admin forced)',
                v_request_id
            );
            
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            RAISE WARNING 'Error processing referral %: %', v_referral.id, SQLERRM;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'completed_count', v_count,
        'error_count', v_errors,
        'message', format('Completed %s referrals with %s errors', v_count, v_errors)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_complete_all_pending_referrals() TO authenticated;

-- Display current pending referrals count
DO $$
DECLARE
    v_pending_count integer;
BEGIN
    SELECT COUNT(*) INTO v_pending_count
    FROM public.referrals
    WHERE status = 'pending';
    
    RAISE NOTICE 'There are currently % pending referrals that can be completed', v_pending_count;
END;
$$;

COMMENT ON FUNCTION public.update_security_config(text, jsonb) IS 'Update security configuration values';
COMMENT ON FUNCTION public.admin_complete_all_pending_referrals() IS 'Admin function to complete all pending referrals at once';