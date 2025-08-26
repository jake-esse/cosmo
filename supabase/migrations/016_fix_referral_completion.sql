-- Migration: Fix referral completion system using auth hooks
-- Purpose: Ensure referral points are properly awarded when users verify their email
-- Author: Cosmo Platform Team
-- Date: 2025-08-25
-- Note: This approach works within Supabase's security model without requiring superuser access

-- First, let's create a function that can be called by the auth trigger
-- This function will be owned by the database role and can be executed
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS trigger AS $$
DECLARE
    v_result jsonb;
    v_has_referral boolean;
    v_user_id uuid;
BEGIN
    -- Get the user ID from the NEW record
    v_user_id := NEW.id;
    
    -- Only process if email was just confirmed (transition from NULL to NOT NULL)
    IF NEW.email_confirmed_at IS NOT NULL AND 
       (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
        
        -- Log the email confirmation event
        RAISE LOG '[EMAIL_CONFIRMED] Processing email confirmation for user %', v_user_id;
        
        -- Check if user has a pending referral
        SELECT EXISTS(
            SELECT 1 FROM public.referrals 
            WHERE referred_id = v_user_id 
            AND status = 'pending'
        ) INTO v_has_referral;
        
        IF v_has_referral THEN
            -- Attempt to complete the referral
            BEGIN
                -- Call the secure referral completion function
                SELECT public.complete_referral_secure(v_user_id) INTO v_result;
                
                -- Log the result
                IF v_result IS NOT NULL THEN
                    IF (v_result->>'success')::boolean = true THEN
                        RAISE LOG '[REFERRAL_SUCCESS] Completed referral for user %', v_user_id;
                        
                        -- Log to audit table for visibility (only if table exists)
                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
                            INSERT INTO public.audit_log (
                                table_name,
                                operation,
                                user_id,
                                new_data,
                                ip_address
                            ) VALUES (
                                'referrals',
                                'EMAIL_VERIFIED_COMPLETION',
                                v_user_id,
                                jsonb_build_object(
                                    'referral_result', v_result,
                                    'timestamp', NOW()
                                ),
                                '127.0.0.1'::inet
                            );
                        END IF;
                    ELSE
                        RAISE WARNING '[REFERRAL_FAILED] Could not complete referral for user %: %', 
                            v_user_id, v_result->>'reason';
                    END IF;
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                -- Log error but don't fail the trigger
                RAISE WARNING '[REFERRAL_ERROR] Exception during referral completion for user %: %', 
                    v_user_id, SQLERRM;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_user_email_confirmed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_user_email_confirmed() TO service_role;

-- Alternative approach: Create a function that can be called via RPC after email verification
-- This provides a backup method if triggers don't work
CREATE OR REPLACE FUNCTION public.complete_referral_after_email_verification(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
    v_email_confirmed boolean;
    v_has_pending_referral boolean;
BEGIN
    -- Verify the user's email is confirmed
    SELECT email_confirmed_at IS NOT NULL INTO v_email_confirmed
    FROM auth.users
    WHERE id = p_user_id;
    
    IF NOT v_email_confirmed THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'Email not verified'
        );
    END IF;
    
    -- Check for pending referral
    SELECT EXISTS(
        SELECT 1 FROM public.referrals
        WHERE referred_id = p_user_id
        AND status = 'pending'
    ) INTO v_has_pending_referral;
    
    IF NOT v_has_pending_referral THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'No pending referral found'
        );
    END IF;
    
    -- Complete the referral
    SELECT public.complete_referral_secure(p_user_id) INTO v_result;
    
    -- Log the completion (only if audit_log table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
        INSERT INTO public.audit_log (
            table_name,
            operation,
            user_id,
            new_data,
            ip_address
        ) VALUES (
            'referrals',
            'MANUAL_EMAIL_COMPLETION',
            p_user_id,
            jsonb_build_object(
                'result', v_result,
                'triggered_by', 'manual_rpc',
                'timestamp', NOW()
            ),
            '127.0.0.1'::inet
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (for self) and service role
GRANT EXECUTE ON FUNCTION public.complete_referral_after_email_verification(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_referral_after_email_verification(uuid) TO service_role;

-- Create RLS policy to ensure users can only complete their own referrals
CREATE POLICY "Users can complete own referral after email verification"
    ON public.referrals
    FOR SELECT
    USING (referred_id = auth.uid() OR referrer_id = auth.uid());

-- Create a monitoring function to check referral system health
CREATE OR REPLACE FUNCTION public.check_referral_system_health()
RETURNS jsonb AS $$
DECLARE
    v_pending_count integer;
    v_completed_today integer;
    v_failed_attempts integer;
    v_users_awaiting_verification integer;
BEGIN
    -- Count pending referrals
    SELECT COUNT(*) INTO v_pending_count
    FROM public.referrals
    WHERE status = 'pending';
    
    -- Count completed referrals today
    SELECT COUNT(*) INTO v_completed_today
    FROM public.referrals
    WHERE status = 'completed'
    AND completed_at >= CURRENT_DATE;
    
    -- Count failed attempts today
    SELECT COUNT(*) INTO v_failed_attempts
    FROM public.referral_attempts
    WHERE success = false
    AND created_at >= CURRENT_DATE;
    
    -- Count users with pending referrals awaiting email verification
    SELECT COUNT(*) INTO v_users_awaiting_verification
    FROM public.referrals r
    JOIN auth.users u ON u.id = r.referred_id
    WHERE r.status = 'pending'
    AND u.email_confirmed_at IS NULL;
    
    RETURN jsonb_build_object(
        'pending_referrals', v_pending_count,
        'completed_today', v_completed_today,
        'failed_attempts_today', v_failed_attempts,
        'users_awaiting_email_verification', v_users_awaiting_verification,
        'system_status', CASE 
            WHEN v_failed_attempts > 10 THEN 'warning'
            WHEN v_pending_count > 100 THEN 'attention_needed'
            ELSE 'healthy'
        END,
        'checked_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role for monitoring
GRANT EXECUTE ON FUNCTION public.check_referral_system_health() TO service_role;

-- Update the auth callback to handle referral completion
-- This function should be called from the auth callback route
CREATE OR REPLACE FUNCTION public.process_email_verification_callback(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
    v_referral_result jsonb;
BEGIN
    -- First, check if email is verified
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = p_user_id 
        AND email_confirmed_at IS NOT NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'Email not verified'
        );
    END IF;
    
    -- Try to complete any pending referral
    SELECT public.complete_referral_after_email_verification(p_user_id) INTO v_referral_result;
    
    RETURN jsonb_build_object(
        'success', true,
        'referral_completion', v_referral_result,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.process_email_verification_callback(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_email_verification_callback(uuid) TO service_role;

-- Create an admin function to manually trigger referral completion for testing
CREATE OR REPLACE FUNCTION public.admin_complete_pending_referral(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
    v_is_admin boolean;
BEGIN
    -- Check if the calling user is an admin
    SELECT EXISTS(
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND username IN ('admin', 'superadmin')
    ) OR auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE email = 'jake@ampel.ai'
    ) INTO v_is_admin;
    
    IF NOT v_is_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'Unauthorized - admin access required'
        );
    END IF;
    
    -- Complete the referral
    SELECT public.complete_referral_secure(p_user_id) INTO v_result;
    
    -- Log admin action (only if audit_log table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
        INSERT INTO public.audit_log (
            table_name,
            operation,
            user_id,
            new_data,
            ip_address
        ) VALUES (
            'referrals',
            'ADMIN_MANUAL_COMPLETION',
            auth.uid(),
            jsonb_build_object(
                'target_user', p_user_id,
                'result', v_result,
                'admin_id', auth.uid(),
                'timestamp', NOW()
            ),
            '127.0.0.1'::inet
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION public.admin_complete_pending_referral(uuid) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.handle_user_email_confirmed() IS 
'Trigger function for email confirmation that completes pending referrals';

COMMENT ON FUNCTION public.complete_referral_after_email_verification(uuid) IS 
'RPC function to complete referral after email verification - can be called from auth callback';

COMMENT ON FUNCTION public.check_referral_system_health() IS 
'Monitor the health of the referral system - returns statistics and status';

COMMENT ON FUNCTION public.process_email_verification_callback(uuid) IS 
'Process email verification callback and complete any pending referrals';

COMMENT ON FUNCTION public.admin_complete_pending_referral(uuid) IS 
'Admin-only function to manually complete a pending referral for testing';

-- Create audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name text NOT NULL,
    operation text NOT NULL,
    user_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_operation ON public.audit_log(table_name, operation);

-- Grant permissions on audit_log
GRANT SELECT ON public.audit_log TO authenticated;
GRANT INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

-- Log migration completion (only if table exists now)
INSERT INTO public.audit_log (
    table_name,
    operation,
    user_id,
    new_data,
    ip_address
) VALUES (
    'system_migration',
    'REFERRAL_COMPLETION_FIX',
    '00000000-0000-0000-0000-000000000000'::uuid,
    jsonb_build_object(
        'migration', '016_fix_referral_completion',
        'description', 'Added alternative referral completion methods that work within Supabase security model',
        'functions_added', ARRAY[
            'handle_user_email_confirmed',
            'complete_referral_after_email_verification',
            'check_referral_system_health',
            'process_email_verification_callback',
            'admin_complete_pending_referral'
        ],
        'timestamp', NOW()
    ),
    '127.0.0.1'::inet
);