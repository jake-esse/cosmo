-- Migration: Force Fix Admin Model Access
-- Description: Completely drops and recreates the function to fix naming conflicts
-- Author: System
-- Date: 2025-01-31

-- First, drop any existing function with CASCADE to remove dependencies
DROP FUNCTION IF EXISTS check_user_model_access(UUID, TEXT) CASCADE;

-- Recreate the function with all column references fully qualified
CREATE FUNCTION check_user_model_access(
    p_user_id UUID,
    p_model_id TEXT
) RETURNS TABLE (
    has_access BOOLEAN,
    remaining INTEGER,
    daily_limit INTEGER,
    tier_required TEXT,
    current_tier TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_user_tier TEXT;
    v_model_tier_req TEXT;  -- Renamed to avoid conflict
    v_daily_limit INTEGER;
    v_usage_today INTEGER;
BEGIN
    -- Check if user is admin
    SELECT profiles.is_admin INTO v_is_admin
    FROM public.profiles
    WHERE profiles.id = p_user_id;
    
    -- If admin, grant unlimited access to all models
    IF v_is_admin = TRUE THEN
        -- Get model tier for display purposes
        SELECT model_config.tier_required INTO v_model_tier_req
        FROM public.model_config
        WHERE model_config.model_id = p_model_id 
        AND model_config.enabled = true;
        
        RETURN QUERY
        SELECT 
            TRUE::BOOLEAN as has_access,
            999999::INTEGER as remaining,
            NULL::INTEGER as daily_limit,
            COALESCE(v_model_tier_req, 'free')::TEXT as tier_required,
            'admin'::TEXT as current_tier;
        RETURN;
    END IF;
    
    -- For non-admin users, use the existing tier-based logic
    -- Get user's tier
    v_user_tier := get_user_tier(p_user_id);
    
    -- Get model's required tier
    SELECT model_config.tier_required INTO v_model_tier_req
    FROM public.model_config
    WHERE model_config.model_id = p_model_id 
    AND model_config.enabled = true;
    
    -- Check if model exists
    IF v_model_tier_req IS NULL THEN
        RETURN QUERY
        SELECT 
            FALSE::BOOLEAN as has_access,
            0::INTEGER as remaining,
            0::INTEGER as daily_limit,
            'unknown'::TEXT as tier_required,
            COALESCE(v_user_tier, 'free')::TEXT as current_tier;
        RETURN;
    END IF;
    
    -- Check tier access
    IF NOT (
        (v_user_tier = 'pro') OR
        (v_user_tier = 'plus' AND v_model_tier_req IN ('free', 'plus')) OR
        (v_user_tier = 'free' AND v_model_tier_req = 'free')
    ) THEN
        RETURN QUERY
        SELECT 
            FALSE::BOOLEAN as has_access,
            0::INTEGER as remaining,
            0::INTEGER as daily_limit,
            v_model_tier_req::TEXT as tier_required,
            COALESCE(v_user_tier, 'free')::TEXT as current_tier;
        RETURN;
    END IF;
    
    -- Get daily limit based on user's tier
    SELECT 
        CASE v_user_tier
            WHEN 'pro' THEN model_config.pro_tier_daily_limit
            WHEN 'plus' THEN model_config.plus_tier_daily_limit
            ELSE model_config.free_tier_daily_limit
        END INTO v_daily_limit
    FROM public.model_config
    WHERE model_config.model_id = p_model_id;
    
    -- If no daily limit (NULL), unlimited access
    IF v_daily_limit IS NULL THEN
        RETURN QUERY
        SELECT 
            TRUE::BOOLEAN as has_access,
            999999::INTEGER as remaining,
            NULL::INTEGER as daily_limit,
            v_model_tier_req::TEXT as tier_required,
            COALESCE(v_user_tier, 'free')::TEXT as current_tier;
        RETURN;
    END IF;
    
    -- Get usage today
    SELECT COALESCE(user_daily_usage.message_count, 0) INTO v_usage_today
    FROM public.user_daily_usage
    WHERE user_daily_usage.user_id = p_user_id 
    AND user_daily_usage.model_id = p_model_id
    AND user_daily_usage.usage_date = CURRENT_DATE;
    
    -- Return access info
    RETURN QUERY
    SELECT 
        TRUE::BOOLEAN as has_access,
        GREATEST(0, v_daily_limit - COALESCE(v_usage_today, 0))::INTEGER as remaining,
        v_daily_limit::INTEGER as daily_limit,
        v_model_tier_req::TEXT as tier_required,
        COALESCE(v_user_tier, 'free')::TEXT as current_tier;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_user_model_access TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_model_access TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION check_user_model_access IS 'Checks if a user has access to a specific AI model. Admin users get unlimited access to all models. Fixed column naming conflicts by using v_model_tier_req variable.';

-- Test the function to ensure it works
DO $$
DECLARE
    v_test_result RECORD;
BEGIN
    -- Test with a known admin user
    SELECT * INTO v_test_result
    FROM check_user_model_access(
        '7b576329-7b5e-457c-a6a3-b7c4d8ba2ef5'::UUID,  -- jake@ampel.ai
        'gemini-2.5-flash-lite'::TEXT
    );
    
    IF v_test_result.has_access = TRUE AND v_test_result.current_tier = 'admin' THEN
        RAISE NOTICE 'SUCCESS: Admin access function is working correctly';
        RAISE NOTICE 'Admin has access: %, remaining: %, tier: %', 
            v_test_result.has_access, 
            v_test_result.remaining,
            v_test_result.current_tier;
    ELSE
        RAISE WARNING 'ISSUE: Admin access may not be working correctly';
        RAISE WARNING 'Result: has_access=%, remaining=%, tier=%', 
            v_test_result.has_access, 
            v_test_result.remaining,
            v_test_result.current_tier;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error testing function: %', SQLERRM;
END;
$$;