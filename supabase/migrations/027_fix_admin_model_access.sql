-- Migration: Fix Admin Model Access Function
-- Description: Fixes naming conflicts and ensures admin users get unlimited access to all models
-- Author: System  
-- Date: 2025-01-31

-- Drop the existing function first
DROP FUNCTION IF EXISTS check_user_model_access(UUID, TEXT);

-- Create the fixed check_user_model_access function
CREATE OR REPLACE FUNCTION check_user_model_access(
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
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_user_tier TEXT;
    v_model_tier TEXT;
    v_daily_limit INTEGER;
    v_usage_today INTEGER;
BEGIN
    -- Check if user is admin
    SELECT profiles.is_admin INTO v_is_admin
    FROM profiles
    WHERE profiles.id = p_user_id;
    
    -- If admin, grant unlimited access to all models
    IF v_is_admin = TRUE THEN
        -- Get model tier for display purposes
        SELECT model_config.tier_required INTO v_model_tier
        FROM model_config
        WHERE model_config.model_id = p_model_id 
        AND model_config.enabled = true;
        
        RETURN QUERY
        SELECT 
            TRUE as has_access,
            999999 as remaining,  -- Effectively unlimited
            NULL::INTEGER as daily_limit,  -- NULL means unlimited
            COALESCE(v_model_tier, 'free'::TEXT) as tier_required,
            'admin'::TEXT as current_tier;
        RETURN;
    END IF;
    
    -- For non-admin users, use the existing tier-based logic
    -- Get user's tier
    SELECT get_user_tier(p_user_id) INTO v_user_tier;
    
    -- Get model's required tier
    SELECT model_config.tier_required INTO v_model_tier
    FROM model_config
    WHERE model_config.model_id = p_model_id 
    AND model_config.enabled = true;
    
    -- Check if model exists
    IF v_model_tier IS NULL THEN
        RETURN QUERY
        SELECT 
            FALSE as has_access,
            0 as remaining,
            0 as daily_limit,
            'unknown'::TEXT as tier_required,
            COALESCE(v_user_tier, 'free'::TEXT) as current_tier;
        RETURN;
    END IF;
    
    -- Check tier access
    IF NOT (
        (v_user_tier = 'pro') OR
        (v_user_tier = 'plus' AND v_model_tier IN ('free', 'plus')) OR
        (v_user_tier = 'free' AND v_model_tier = 'free')
    ) THEN
        RETURN QUERY
        SELECT 
            FALSE as has_access,
            0 as remaining,
            0 as daily_limit,
            v_model_tier as tier_required,
            COALESCE(v_user_tier, 'free'::TEXT) as current_tier;
        RETURN;
    END IF;
    
    -- Get daily limit based on user's tier
    SELECT 
        CASE v_user_tier
            WHEN 'pro' THEN model_config.pro_tier_daily_limit
            WHEN 'plus' THEN model_config.plus_tier_daily_limit
            ELSE model_config.free_tier_daily_limit
        END INTO v_daily_limit
    FROM model_config
    WHERE model_config.model_id = p_model_id;
    
    -- If no daily limit (NULL), unlimited access
    IF v_daily_limit IS NULL THEN
        RETURN QUERY
        SELECT 
            TRUE as has_access,
            999999 as remaining,
            NULL::INTEGER as daily_limit,
            v_model_tier as tier_required,
            COALESCE(v_user_tier, 'free'::TEXT) as current_tier;
        RETURN;
    END IF;
    
    -- Get usage today
    SELECT COALESCE(user_daily_usage.message_count, 0) INTO v_usage_today
    FROM user_daily_usage
    WHERE user_daily_usage.user_id = p_user_id 
    AND user_daily_usage.model_id = p_model_id
    AND user_daily_usage.usage_date = CURRENT_DATE;
    
    -- Return access info
    RETURN QUERY
    SELECT 
        TRUE as has_access,
        GREATEST(0, v_daily_limit - COALESCE(v_usage_today, 0)) as remaining,
        v_daily_limit as daily_limit,
        v_model_tier as tier_required,
        COALESCE(v_user_tier, 'free'::TEXT) as current_tier;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_user_model_access TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION check_user_model_access IS 'Checks if a user has access to a specific AI model. Admin users get unlimited access to all models. Fixed to resolve column naming conflicts.';

-- Let's also verify the admin flag is set correctly
-- This is just a check, not a change
DO $$
DECLARE
    v_admin_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 
        FROM profiles p
        JOIN auth.users u ON p.id = u.id
        WHERE u.email = 'jake@ampel.ai' 
        AND p.is_admin = true
    ) INTO v_admin_exists;
    
    IF NOT v_admin_exists THEN
        RAISE NOTICE 'Warning: jake@ampel.ai is not marked as admin or does not exist';
    ELSE
        RAISE NOTICE 'Admin account jake@ampel.ai is properly configured';
    END IF;
END;
$$;