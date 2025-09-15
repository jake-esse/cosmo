-- Migration: Admin Model Access Override
-- Description: Allows admin users to bypass all model restrictions and access limits
-- Author: System
-- Date: 2025-01-31

-- Drop the existing function first (if it exists)
DROP FUNCTION IF EXISTS check_user_model_access(UUID, TEXT);

-- Create the check_user_model_access function to give admins unlimited access
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
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = p_user_id;
    
    -- If admin, grant unlimited access to all models
    IF v_is_admin = TRUE THEN
        SELECT tier_required INTO v_model_tier
        FROM model_config
        WHERE model_id = p_model_id AND enabled = true;
        
        RETURN QUERY
        SELECT 
            TRUE as has_access,
            999999 as remaining,  -- Effectively unlimited
            NULL::INTEGER as daily_limit,  -- NULL means unlimited
            v_model_tier as tier_required,
            'admin'::TEXT as current_tier;
        RETURN;
    END IF;
    
    -- For non-admin users, use the existing tier-based logic
    -- Get user's tier
    SELECT get_user_tier(p_user_id) INTO v_user_tier;
    
    -- Get model's required tier
    SELECT tier_required INTO v_model_tier
    FROM model_config
    WHERE model_id = p_model_id AND enabled = true;
    
    -- Check if user has access based on tier hierarchy
    IF v_model_tier IS NULL THEN
        RETURN QUERY
        SELECT 
            FALSE as has_access,
            0 as remaining,
            0 as daily_limit,
            'unknown'::TEXT as tier_required,
            v_user_tier as current_tier;
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
            v_user_tier as current_tier;
        RETURN;
    END IF;
    
    -- Get daily limit based on user's tier
    SELECT 
        CASE v_user_tier
            WHEN 'pro' THEN pro_tier_daily_limit
            WHEN 'plus' THEN plus_tier_daily_limit
            ELSE free_tier_daily_limit
        END INTO v_daily_limit
    FROM model_config
    WHERE model_id = p_model_id;
    
    -- If no daily limit (NULL), unlimited access
    IF v_daily_limit IS NULL THEN
        RETURN QUERY
        SELECT 
            TRUE as has_access,
            999999 as remaining,
            NULL::INTEGER as daily_limit,
            v_model_tier as tier_required,
            v_user_tier as current_tier;
        RETURN;
    END IF;
    
    -- Get usage today
    SELECT COALESCE(message_count, 0) INTO v_usage_today
    FROM user_daily_usage
    WHERE user_id = p_user_id 
    AND model_id = p_model_id
    AND usage_date = CURRENT_DATE;
    
    -- Return access info
    RETURN QUERY
    SELECT 
        TRUE as has_access,
        GREATEST(0, v_daily_limit - COALESCE(v_usage_today, 0)) as remaining,
        v_daily_limit as daily_limit,
        v_model_tier as tier_required,
        v_user_tier as current_tier;
END;
$$;

-- Also update get_user_tier to recognize admin status
CREATE OR REPLACE FUNCTION get_user_tier(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_tier TEXT;
BEGIN
    -- Check if user is admin first
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = p_user_id;
    
    -- Admins get pro tier access
    IF v_is_admin = TRUE THEN
        RETURN 'pro';
    END IF;
    
    -- Check for active subscription
    SELECT t.name INTO v_tier
    FROM user_subscriptions s
    JOIN subscription_tiers t ON s.tier_id = t.id
    WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND s.current_period_end > NOW()
    ORDER BY t.sort_order DESC
    LIMIT 1;
    
    -- Return tier or default to free
    RETURN COALESCE(v_tier, 'free');
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_user_model_access TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tier TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION check_user_model_access IS 'Checks if a user has access to a specific AI model. Admin users get unlimited access to all models.';
COMMENT ON FUNCTION get_user_tier IS 'Returns the user tier (free/plus/pro). Admin users automatically get pro tier access.';