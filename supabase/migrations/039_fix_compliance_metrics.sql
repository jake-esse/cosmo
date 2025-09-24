-- Migration: Fix Compliance Metrics Function
-- Purpose: Update get_compliance_metrics to use existing columns
-- Date: 2025-01-17

-- Fix the get_compliance_metrics function to use existing columns
CREATE OR REPLACE FUNCTION public.get_compliance_metrics()
RETURNS TABLE (
    total_users BIGINT,
    active_participants BIGINT,
    notifications_this_week BIGINT,
    recent_exports BIGINT,
    unread_notifications BIGINT,
    critical_notices BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.profiles)::BIGINT as total_users,
        -- Use updated_at instead of non-existent last_activity_at
        (SELECT COUNT(*) FROM public.profiles WHERE updated_at > NOW() - INTERVAL '30 days')::BIGINT as active_participants,
        (SELECT COUNT(*) FROM public.user_notifications WHERE created_at > NOW() - INTERVAL '7 days')::BIGINT as notifications_this_week,
        (SELECT COUNT(*) FROM public.compliance_exports WHERE created_at > NOW() - INTERVAL '30 days')::BIGINT as recent_exports,
        (SELECT COUNT(*) FROM public.user_notifications WHERE read_at IS NULL)::BIGINT as unread_notifications,
        (SELECT COUNT(*) FROM public.system_notices WHERE priority = 'critical' AND created_at > NOW() - INTERVAL '7 days')::BIGINT as critical_notices;
END;
$$;

-- Also fix the get_recent_compliance_activity function to handle cases where compliance_audit_log might be empty
CREATE OR REPLACE FUNCTION public.get_recent_compliance_activity(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    activity_type TEXT,
    description TEXT,
    created_at TIMESTAMPTZ,
    metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cal.id,
        cal.action_type as activity_type,
        CASE
            WHEN cal.action_type = 'notice_created' THEN 'Created new system notice'
            WHEN cal.action_type = 'notice_broadcast' THEN 'Broadcast notice to users'
            WHEN cal.action_type = 'data_export' THEN 'Exported compliance data'
            WHEN cal.action_type = 'account_created' THEN 'New compliance account created'
            WHEN cal.action_type = 'permission_changed' THEN 'User permissions updated'
            ELSE COALESCE(cal.action_type, 'Unknown activity')
        END as description,
        cal.created_at,
        cal.action_details as metadata
    FROM public.compliance_audit_log cal
    ORDER BY cal.created_at DESC
    LIMIT p_limit;
END;
$$;