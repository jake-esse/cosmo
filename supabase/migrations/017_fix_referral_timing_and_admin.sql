-- Migration: Fix referral timing race condition and add explicit admin flag
-- Purpose: Ensure referral points are awarded regardless of email verification timing
-- Author: Cosmo Platform Team
-- Date: 2025-08-25

-- STEP 1: Add is_admin column to profiles table for consistent admin access
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- Update existing admin users to have is_admin = true
UPDATE public.profiles 
SET is_admin = true 
WHERE username IN ('admin', 'superadmin') 
   OR id IN (SELECT id FROM auth.users WHERE email = 'jake@ampel.ai');

-- STEP 2: Create function to complete pending referrals for a user
CREATE OR REPLACE FUNCTION public.complete_pending_referrals_for_user(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
    v_email_verified boolean;
    v_pending_referral record;
    v_completion_count integer := 0;
    v_error_count integer := 0;
    v_results jsonb[] := ARRAY[]::jsonb[];
BEGIN
    -- Check if user's email is verified
    SELECT email_confirmed_at IS NOT NULL INTO v_email_verified
    FROM auth.users
    WHERE id = p_user_id;
    
    IF NOT v_email_verified THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'Email not verified',
            'completed_count', 0
        );
    END IF;
    
    -- Process all pending referrals for this user
    FOR v_pending_referral IN 
        SELECT * FROM public.referrals 
        WHERE referred_id = p_user_id 
        AND status = 'pending'
    LOOP
        BEGIN
            -- Attempt to complete this referral
            SELECT public.complete_referral_secure(p_user_id) INTO v_result;
            
            IF v_result IS NOT NULL AND (v_result->>'success')::boolean = true THEN
                v_completion_count := v_completion_count + 1;
                v_results := array_append(v_results, v_result);
                
                RAISE NOTICE '[REFERRAL_COMPLETED] Successfully completed referral % for user %', 
                    v_pending_referral.id, p_user_id;
            ELSE
                v_error_count := v_error_count + 1;
                RAISE WARNING '[REFERRAL_FAILED] Failed to complete referral % for user %: %', 
                    v_pending_referral.id, p_user_id, v_result->>'reason';
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            RAISE WARNING '[REFERRAL_ERROR] Exception completing referral % for user %: %', 
                v_pending_referral.id, p_user_id, SQLERRM;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'completed_count', v_completion_count,
        'error_count', v_error_count,
        'results', to_jsonb(v_results),
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Create improved user creation handler that checks email verification status
CREATE OR REPLACE FUNCTION public.handle_new_user_secure_v2()
RETURNS TRIGGER AS $$
DECLARE
    v_username text;
    v_display_name text;
    v_full_name text;
    v_referral_code text;
    v_referred_by_code text;
    v_referrer_id uuid;
    v_request_id text;
    v_user_ip inet;
    v_user_agent text;
    v_email_already_verified boolean;
    v_referral_result jsonb;
BEGIN
    -- Extract metadata
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    
    v_display_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        v_full_name
    );
    
    -- Extract referral code if provided
    v_referred_by_code := NEW.raw_user_meta_data->>'referral_code';
    
    -- Extract security metadata
    v_user_ip := COALESCE(
        (NEW.raw_user_meta_data->>'signup_ip')::inet,
        '0.0.0.0'::inet
    );
    
    v_user_agent := COALESCE(
        NEW.raw_user_meta_data->>'user_agent',
        'Unknown'
    );
    
    -- Check if email is already verified (important for OAuth signups)
    v_email_already_verified := NEW.email_confirmed_at IS NOT NULL;
    
    RAISE NOTICE '[USER_CREATED] Processing new user % with email verification status: %', 
        NEW.id, CASE WHEN v_email_already_verified THEN 'VERIFIED' ELSE 'PENDING' END;
    
    -- Generate username from email
    v_username := public.generate_unique_username(NEW.email);
    
    -- Generate unique referral code for this user
    v_referral_code := public.generate_referral_code();
    
    -- Create profile
    INSERT INTO public.profiles (
        id,
        username,
        display_name,
        full_name,
        referral_code,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        v_username,
        v_display_name,
        v_full_name,
        v_referral_code,
        NOW(),
        NOW()
    );
    
    -- Award signup bonus (100 points)
    v_request_id := 'signup_' || NEW.id::text || '_' || extract(epoch from NOW())::text;
    PERFORM public.award_equity_points(
        NEW.id,
        100,
        'signup_bonus',
        'Welcome bonus for joining Cosmo',
        v_request_id
    );
    
    RAISE NOTICE '[SIGNUP_BONUS] Awarded 100 points to user %', NEW.id;
    
    -- Process referral if code was provided
    IF v_referred_by_code IS NOT NULL THEN
        -- Find referrer
        SELECT id INTO v_referrer_id
        FROM public.profiles
        WHERE UPPER(referral_code) = UPPER(v_referred_by_code);
        
        IF v_referrer_id IS NOT NULL THEN
            -- Create referral record
            INSERT INTO public.referrals (
                referrer_id,
                referred_id,
                status,
                code_used,
                referred_email,
                signup_ip,
                user_agent,
                created_at
            ) VALUES (
                v_referrer_id,
                NEW.id,
                'pending',
                UPPER(v_referred_by_code),
                NEW.email,
                v_user_ip,
                v_user_agent,
                NOW()
            );
            
            RAISE NOTICE '[REFERRAL_CREATED] Created referral record for user % referred by %', 
                NEW.id, v_referrer_id;
            
            -- CRITICAL: If email is already verified, complete the referral immediately
            IF v_email_already_verified THEN
                RAISE NOTICE '[REFERRAL_IMMEDIATE] Email already verified, completing referral immediately for user %', NEW.id;
                
                -- Complete the referral right away
                SELECT public.complete_pending_referrals_for_user(NEW.id) INTO v_referral_result;
                
                IF v_referral_result IS NOT NULL THEN
                    RAISE NOTICE '[REFERRAL_IMMEDIATE_RESULT] Immediate referral completion result: %', v_referral_result;
                END IF;
            END IF;
        ELSE
            RAISE WARNING '[REFERRAL_INVALID] Invalid referral code % for user %', v_referred_by_code, NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Replace the existing trigger with the new version
DROP TRIGGER IF EXISTS on_auth_user_created_secure ON auth.users;

CREATE TRIGGER on_auth_user_created_secure
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_secure_v2();

-- STEP 5: Create function to process ALL stuck referrals (admin use)
CREATE OR REPLACE FUNCTION public.process_all_stuck_referrals()
RETURNS jsonb AS $$
DECLARE
    v_stuck_referral record;
    v_total_processed integer := 0;
    v_total_completed integer := 0;
    v_total_errors integer := 0;
    v_result jsonb;
    v_details jsonb[] := ARRAY[]::jsonb[];
BEGIN
    -- Find all pending referrals where the user's email is already verified
    FOR v_stuck_referral IN 
        SELECT r.*, u.email, u.email_confirmed_at
        FROM public.referrals r
        JOIN auth.users u ON u.id = r.referred_id
        WHERE r.status = 'pending'
        AND u.email_confirmed_at IS NOT NULL
    LOOP
        v_total_processed := v_total_processed + 1;
        
        BEGIN
            -- Attempt to complete this referral
            SELECT public.complete_referral_secure(v_stuck_referral.referred_id) INTO v_result;
            
            IF v_result IS NOT NULL AND (v_result->>'success')::boolean = true THEN
                v_total_completed := v_total_completed + 1;
                
                v_details := array_append(v_details, jsonb_build_object(
                    'referral_id', v_stuck_referral.id,
                    'referred_id', v_stuck_referral.referred_id,
                    'email', v_stuck_referral.email,
                    'status', 'completed',
                    'result', v_result
                ));
                
                RAISE NOTICE '[STUCK_REFERRAL_FIXED] Completed stuck referral % for user %', 
                    v_stuck_referral.id, v_stuck_referral.referred_id;
            ELSE
                v_total_errors := v_total_errors + 1;
                
                v_details := array_append(v_details, jsonb_build_object(
                    'referral_id', v_stuck_referral.id,
                    'referred_id', v_stuck_referral.referred_id,
                    'email', v_stuck_referral.email,
                    'status', 'failed',
                    'error', COALESCE(v_result->>'reason', 'Unknown error')
                ));
                
                RAISE WARNING '[STUCK_REFERRAL_ERROR] Failed to complete stuck referral % for user %: %', 
                    v_stuck_referral.id, v_stuck_referral.referred_id, v_result->>'reason';
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_total_errors := v_total_errors + 1;
            
            v_details := array_append(v_details, jsonb_build_object(
                'referral_id', v_stuck_referral.id,
                'referred_id', v_stuck_referral.referred_id,
                'email', v_stuck_referral.email,
                'status', 'exception',
                'error', SQLERRM
            ));
            
            RAISE WARNING '[STUCK_REFERRAL_EXCEPTION] Exception processing stuck referral %: %', 
                v_stuck_referral.id, SQLERRM;
        END;
    END LOOP;
    
    -- Log the batch processing to audit log if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
        INSERT INTO public.audit_log (
            table_name,
            operation,
            user_id,
            new_data,
            ip_address
        ) VALUES (
            'referrals',
            'BATCH_STUCK_REFERRAL_PROCESSING',
            auth.uid(),
            jsonb_build_object(
                'total_processed', v_total_processed,
                'total_completed', v_total_completed,
                'total_errors', v_total_errors,
                'details', to_jsonb(v_details),
                'timestamp', NOW()
            ),
            '127.0.0.1'::inet
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'total_processed', v_total_processed,
        'total_completed', v_total_completed,
        'total_errors', v_total_errors,
        'details', to_jsonb(v_details),
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 6: Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.complete_pending_referrals_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_pending_referrals_for_user(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.handle_new_user_secure_v2() TO service_role;

GRANT EXECUTE ON FUNCTION public.process_all_stuck_referrals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_all_stuck_referrals() TO service_role;

-- STEP 7: Add RLS policy for is_admin column
CREATE POLICY "Users can view own admin status" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR is_admin = true);

-- STEP 8: Create a helper function to check admin status
CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
DECLARE
    v_is_admin boolean;
BEGIN
    SELECT is_admin INTO v_is_admin
    FROM public.profiles
    WHERE id = p_user_id;
    
    RETURN COALESCE(v_is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid) TO authenticated;

-- STEP 9: Add comments for documentation
COMMENT ON COLUMN public.profiles.is_admin IS 'Explicit admin flag for consistent admin panel access';
COMMENT ON FUNCTION public.complete_pending_referrals_for_user(uuid) IS 'Completes all pending referrals for a user if their email is verified';
COMMENT ON FUNCTION public.handle_new_user_secure_v2() IS 'Enhanced user creation handler that handles race condition where email is verified before referral creation';
COMMENT ON FUNCTION public.process_all_stuck_referrals() IS 'Admin function to process all stuck referrals where email is verified but referral is pending';
COMMENT ON FUNCTION public.is_user_admin(uuid) IS 'Helper function to check if a user has admin privileges';

-- STEP 10: Process all existing stuck referrals
DO $$
DECLARE
    v_result jsonb;
BEGIN
    -- Process all stuck referrals
    SELECT public.process_all_stuck_referrals() INTO v_result;
    
    RAISE NOTICE '[MIGRATION_CLEANUP] Processed stuck referrals: %', v_result;
    
    -- Log migration success
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
        INSERT INTO public.audit_log (
            table_name,
            operation,
            user_id,
            new_data,
            ip_address
        ) VALUES (
            'system_migration',
            'REFERRAL_TIMING_AND_ADMIN_FIX',
            '00000000-0000-0000-0000-000000000000'::uuid,
            jsonb_build_object(
                'migration', '017_fix_referral_timing_and_admin',
                'description', 'Fixed referral timing race condition and added explicit admin flag',
                'stuck_referrals_processed', v_result,
                'timestamp', NOW()
            ),
            '127.0.0.1'::inet
        );
    END IF;
END;
$$;

-- STEP 11: Verify the migration worked
DO $$
DECLARE
    v_pending_count integer;
    v_admin_count integer;
BEGIN
    -- Count remaining pending referrals with verified emails
    SELECT COUNT(*) INTO v_pending_count
    FROM public.referrals r
    JOIN auth.users u ON u.id = r.referred_id
    WHERE r.status = 'pending'
    AND u.email_confirmed_at IS NOT NULL;
    
    -- Count admin users
    SELECT COUNT(*) INTO v_admin_count
    FROM public.profiles
    WHERE is_admin = true;
    
    RAISE NOTICE '[MIGRATION_VERIFICATION] Remaining stuck referrals: %, Admin users: %', 
        v_pending_count, v_admin_count;
    
    IF v_pending_count > 0 THEN
        RAISE WARNING '[MIGRATION_WARNING] There are still % stuck referrals that need attention', v_pending_count;
    END IF;
END;
$$;