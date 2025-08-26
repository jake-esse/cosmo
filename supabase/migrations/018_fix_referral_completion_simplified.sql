-- Migration: Simplified fix for referral completion
-- Purpose: Fix the referral completion that's failing due to transaction issues
-- Author: Cosmo Platform Team
-- Date: 2025-08-25

-- Drop the problematic v2 trigger that might be causing issues
DROP TRIGGER IF EXISTS on_auth_user_created_secure ON auth.users;

-- Create a simpler, more reliable user creation handler
CREATE OR REPLACE FUNCTION public.handle_new_user_with_referral()
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
    
    -- Generate username from email
    v_username := public.generate_unique_username(NEW.email);
    
    -- Generate unique referral code for this user
    v_referral_code := public.generate_referral_code();
    
    -- Create profile (add is_admin column if not exists)
    INSERT INTO public.profiles (
        id,
        username,
        display_name,
        full_name,
        referral_code,
        is_admin,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        v_username,
        v_display_name,
        v_full_name,
        v_referral_code,
        false, -- Default to non-admin
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
    
    -- Process referral if code was provided
    IF v_referred_by_code IS NOT NULL THEN
        -- Find referrer
        SELECT id INTO v_referrer_id
        FROM public.profiles
        WHERE UPPER(referral_code) = UPPER(v_referred_by_code);
        
        IF v_referrer_id IS NOT NULL THEN
            -- Create referral record (always as pending initially)
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
                'pending', -- Always start as pending
                UPPER(v_referred_by_code),
                NEW.email,
                v_user_ip,
                v_user_agent,
                NOW()
            );
            
            RAISE NOTICE '[REFERRAL_CREATED] Created pending referral for user %', NEW.id;
        ELSE
            RAISE WARNING '[REFERRAL_INVALID] Invalid referral code % for user %', v_referred_by_code, NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail user creation
    RAISE WARNING '[USER_CREATION_ERROR] Error in handle_new_user_with_referral for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_with_referral();

-- Create a simplified function to complete referrals that actually works
CREATE OR REPLACE FUNCTION public.simple_complete_referral(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_referral record;
    v_referrer_points integer := 50;
    v_referred_points integer := 25;
    v_request_id text;
BEGIN
    -- Check if user's email is verified
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = p_user_id 
        AND email_confirmed_at IS NOT NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Email not verified');
    END IF;
    
    -- Find pending referral
    SELECT * INTO v_referral
    FROM public.referrals
    WHERE referred_id = p_user_id
    AND status = 'pending'
    LIMIT 1;
    
    IF v_referral IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'No pending referral found');
    END IF;
    
    -- Update referral status
    UPDATE public.referrals
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = v_referral.id;
    
    -- Award points to referrer
    v_request_id := 'referral_referrer_' || v_referral.id::text;
    PERFORM public.award_equity_points(
        v_referral.referrer_id,
        v_referrer_points,
        'referral_bonus',
        'Referral bonus for inviting a friend',
        v_request_id
    );
    
    -- Award points to referred user
    v_request_id := 'referral_referred_' || v_referral.id::text;
    PERFORM public.award_equity_points(
        v_referral.referred_id,
        v_referred_points,
        'referral_bonus',
        'Bonus for joining via referral',
        v_request_id
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'referral_id', v_referral.id,
        'referrer_points', v_referrer_points,
        'referred_points', v_referred_points
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'reason', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.simple_complete_referral(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.simple_complete_referral(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user_with_referral() TO service_role;

-- Create a function that processes all stuck referrals (for admin use)
CREATE OR REPLACE FUNCTION public.fix_all_stuck_referrals()
RETURNS jsonb AS $$
DECLARE
    v_user record;
    v_result jsonb;
    v_results jsonb[] := ARRAY[]::jsonb[];
    v_total integer := 0;
    v_completed integer := 0;
BEGIN
    -- Find all users with pending referrals and verified emails
    FOR v_user IN 
        SELECT DISTINCT r.referred_id, u.email
        FROM public.referrals r
        JOIN auth.users u ON u.id = r.referred_id
        WHERE r.status = 'pending'
        AND u.email_confirmed_at IS NOT NULL
    LOOP
        v_total := v_total + 1;
        
        -- Try to complete the referral
        SELECT public.simple_complete_referral(v_user.referred_id) INTO v_result;
        
        IF v_result->>'success' = 'true' THEN
            v_completed := v_completed + 1;
        END IF;
        
        v_results := array_append(v_results, jsonb_build_object(
            'user_id', v_user.referred_id,
            'email', v_user.email,
            'result', v_result
        ));
    END LOOP;
    
    RETURN jsonb_build_object(
        'total_processed', v_total,
        'total_completed', v_completed,
        'results', to_jsonb(v_results)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.fix_all_stuck_referrals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fix_all_stuck_referrals() TO service_role;

-- Create a trigger that fires when email is confirmed
CREATE OR REPLACE FUNCTION public.handle_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if email was just confirmed
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
        -- Try to complete any pending referral
        PERFORM public.simple_complete_referral(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: We can't create this trigger directly on auth.users, but document it for manual creation
-- CREATE TRIGGER on_email_confirmed
--     AFTER UPDATE ON auth.users
--     FOR EACH ROW
--     WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
--     EXECUTE FUNCTION public.handle_email_confirmed();

-- Add comment
COMMENT ON FUNCTION public.simple_complete_referral(uuid) IS 'Simplified referral completion that avoids transaction issues';
COMMENT ON FUNCTION public.fix_all_stuck_referrals() IS 'Admin function to fix all stuck referrals at once';

-- Set jake@ampel.ai as admin if not already set
UPDATE public.profiles
SET is_admin = true
WHERE id IN (SELECT id FROM auth.users WHERE email = 'jake@ampel.ai')
AND is_admin IS NOT true;