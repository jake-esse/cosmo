-- Migration: Ensure referral trigger uses correct column names
-- Purpose: Fix the referral creation to use the actual column names in the referrals table
-- Author: Cosmo Platform Team
-- Date: 2025-08-25

-- Drop existing triggers that might be conflicting
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_secure ON auth.users;

-- Drop old function versions
DROP FUNCTION IF EXISTS public.handle_new_user_with_referral() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_secure() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_secure_v2() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_create_fixed() CASCADE;

-- Create a clean, working trigger function
CREATE OR REPLACE FUNCTION public.handle_user_signup_with_referral()
RETURNS TRIGGER AS $$
DECLARE
    v_username text;
    v_display_name text;
    v_full_name text;
    v_user_referral_code text;
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
    v_user_referral_code := public.generate_referral_code();
    
    -- Create profile
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
        v_user_referral_code,
        COALESCE((NEW.email = 'jake@ampel.ai'), false), -- Auto-set admin for jake
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();
    
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
    IF v_referred_by_code IS NOT NULL AND v_referred_by_code != '' THEN
        -- Find referrer by their referral code
        SELECT id INTO v_referrer_id
        FROM public.profiles
        WHERE UPPER(referral_code) = UPPER(v_referred_by_code);
        
        IF v_referrer_id IS NOT NULL THEN
            -- Create referral record with CORRECT column names
            BEGIN
                INSERT INTO public.referrals (
                    referrer_id,
                    referred_id,
                    referral_code,      -- NOT code_used
                    status,
                    signup_ip,          -- NOT referred_email
                    signup_user_agent,  -- NOT user_agent
                    created_at
                ) VALUES (
                    v_referrer_id,
                    NEW.id,
                    UPPER(v_referred_by_code),
                    'pending',
                    v_user_ip,
                    v_user_agent,
                    NOW()
                );
                
                RAISE NOTICE '[REFERRAL_CREATED] Created referral for user % with code %', NEW.id, v_referred_by_code;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING '[REFERRAL_ERROR] Could not create referral: %', SQLERRM;
            END;
        ELSE
            RAISE WARNING '[REFERRAL_CODE_NOT_FOUND] No user found with referral code: %', v_referred_by_code;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING '[SIGNUP_ERROR] Error in trigger for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_signup_with_referral();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_user_signup_with_referral() TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION public.handle_user_signup_with_referral() IS 
'Handles new user signup: creates profile, awards signup bonus, and creates referral record if code provided';

-- Log migration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
        INSERT INTO public.audit_log (
            table_name,
            operation,
            user_id,
            new_data,
            ip_address
        ) VALUES (
            'system_migration',
            'ENSURE_REFERRAL_TRIGGER_WORKS',
            '00000000-0000-0000-0000-000000000000'::uuid,
            jsonb_build_object(
                'migration', '020_ensure_referral_trigger_works',
                'description', 'Ensured referral trigger uses correct column names',
                'timestamp', NOW()
            ),
            '127.0.0.1'::inet
        );
    END IF;
END;
$$;