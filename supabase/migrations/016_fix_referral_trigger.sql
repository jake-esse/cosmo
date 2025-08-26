-- Migration: Fix referral completion trigger for email verification
-- Purpose: Ensure referral points are properly awarded when users verify their email
-- Author: Cosmo Platform Team
-- Date: 2025-08-25

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_email_verified ON auth.users;
DROP FUNCTION IF EXISTS public.handle_email_verification() CASCADE;

-- Create improved trigger function with proper error handling and logging
CREATE OR REPLACE FUNCTION public.handle_email_verification()
RETURNS TRIGGER AS $$
DECLARE
    v_result jsonb;
    v_has_referral boolean;
BEGIN
    -- Only process if email just got confirmed (transition from NULL to NOT NULL)
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
        -- Log the email verification event
        RAISE NOTICE '[EMAIL_VERIFICATION] Email verified for user %', NEW.id;
        
        -- Check if user has a pending referral
        SELECT EXISTS(
            SELECT 1 FROM public.referrals 
            WHERE referred_id = NEW.id 
            AND status = 'pending'
        ) INTO v_has_referral;
        
        IF v_has_referral THEN
            RAISE NOTICE '[REFERRAL_CHECK] User % has pending referral, attempting completion', NEW.id;
            
            -- Attempt to complete the referral using the secure function
            BEGIN
                -- Call the secure referral completion function
                SELECT public.complete_referral_secure(NEW.id) INTO v_result;
                
                -- Log the result
                IF v_result IS NOT NULL THEN
                    IF (v_result->>'success')::boolean = true THEN
                        RAISE NOTICE '[REFERRAL_SUCCESS] Referral completed successfully for user %. Points awarded: referrer=%, referred=%', 
                            NEW.id, 
                            COALESCE(v_result->>'referrer_points_awarded', '0'),
                            COALESCE(v_result->>'referred_points_awarded', '0');
                    ELSE
                        RAISE WARNING '[REFERRAL_FAILED] Referral completion failed for user %: %', 
                            NEW.id, 
                            COALESCE(v_result->>'reason', 'Unknown error');
                    END IF;
                ELSE
                    RAISE WARNING '[REFERRAL_ERROR] Null result from complete_referral_secure for user %', NEW.id;
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                -- Log any errors but don't fail the trigger
                RAISE WARNING '[REFERRAL_EXCEPTION] Error completing referral for user %: %', NEW.id, SQLERRM;
            END;
        ELSE
            RAISE NOTICE '[REFERRAL_SKIP] No pending referral found for user %', NEW.id;
        END IF;
        
        -- Log completion of email verification handling
        RAISE NOTICE '[EMAIL_VERIFICATION_COMPLETE] Finished processing email verification for user %', NEW.id;
    END IF;
    
    -- Always return NEW to allow the update to proceed
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_email_verification() IS 
'Trigger function that runs after email verification to complete pending referrals and award equity points';

-- Create the trigger with explicit schema reference and proper conditions
CREATE TRIGGER on_email_verified
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
    EXECUTE FUNCTION public.handle_email_verification();

-- Add comment for documentation
COMMENT ON TRIGGER on_email_verified ON auth.users IS 
'Trigger that fires when a user verifies their email to complete referral and award points';

-- Create a helper function to manually test/debug referral completion
CREATE OR REPLACE FUNCTION public.debug_referral_status(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
    v_user_data jsonb;
    v_referral_data jsonb;
BEGIN
    -- Get user data
    SELECT jsonb_build_object(
        'user_id', u.id,
        'email', u.email,
        'email_confirmed_at', u.email_confirmed_at,
        'created_at', u.created_at
    ) INTO v_user_data
    FROM auth.users u
    WHERE u.id = p_user_id;
    
    -- Get referral data
    SELECT jsonb_build_object(
        'referral_id', r.id,
        'referrer_id', r.referrer_id,
        'referred_id', r.referred_id,
        'status', r.status,
        'code_used', r.code_used,
        'created_at', r.created_at,
        'completed_at', r.completed_at
    ) INTO v_referral_data
    FROM public.referrals r
    WHERE r.referred_id = p_user_id
    ORDER BY r.created_at DESC
    LIMIT 1;
    
    -- Build result
    v_result := jsonb_build_object(
        'user', v_user_data,
        'referral', v_referral_data,
        'has_verified_email', (v_user_data->>'email_confirmed_at') IS NOT NULL,
        'has_pending_referral', v_referral_data->>'status' = 'pending',
        'can_complete_referral', 
            (v_user_data->>'email_confirmed_at') IS NOT NULL AND 
            v_referral_data->>'status' = 'pending'
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION public.debug_referral_status(uuid) IS 
'Debug function to check referral status and eligibility for a specific user';

-- Create audit log entry for this migration
INSERT INTO public.audit_log (
    table_name,
    operation,
    user_id,
    new_data,
    ip_address
) VALUES (
    'system_migration',
    'FIX_REFERRAL_TRIGGER',
    '00000000-0000-0000-0000-000000000000'::uuid,
    jsonb_build_object(
        'migration', '016_fix_referral_trigger',
        'description', 'Fixed email verification trigger to properly award referral points',
        'timestamp', NOW()
    ),
    '127.0.0.1'::inet
);

-- Test the trigger setup (this will only log, not actually change anything)
DO $$
DECLARE
    v_trigger_exists boolean;
    v_function_exists boolean;
BEGIN
    -- Check if trigger exists
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_email_verified'
    ) INTO v_trigger_exists;
    
    -- Check if function exists
    SELECT EXISTS(
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_email_verification'
    ) INTO v_function_exists;
    
    IF v_trigger_exists AND v_function_exists THEN
        RAISE NOTICE '[MIGRATION_SUCCESS] Referral trigger successfully installed and ready';
    ELSE
        RAISE WARNING '[MIGRATION_WARNING] Trigger installation may have issues - trigger exists: %, function exists: %', 
            v_trigger_exists, v_function_exists;
    END IF;
END;
$$;