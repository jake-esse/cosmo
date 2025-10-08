-- Fix notification functions with proper error handling and permissions
-- This migration comprehensively fixes the notification system

-- First, drop existing functions to recreate them properly
DROP FUNCTION IF EXISTS public.broadcast_system_notice CASCADE;
DROP FUNCTION IF EXISTS public.get_user_notifications CASCADE;
DROP FUNCTION IF EXISTS public.get_unread_notification_count CASCADE;

-- Fix columns in user_notifications to match function expectations
ALTER TABLE public.user_notifications
ADD COLUMN IF NOT EXISTS notice_id UUID,
ADD COLUMN IF NOT EXISTS related_notice_id UUID REFERENCES public.system_notices(id);

-- Update notice_id column if related_notice_id exists
UPDATE public.user_notifications
SET notice_id = related_notice_id
WHERE related_notice_id IS NOT NULL AND notice_id IS NULL;

-- Create improved broadcast_system_notice function
CREATE OR REPLACE FUNCTION public.broadcast_system_notice(
    p_title TEXT,
    p_content TEXT,
    p_notice_type TEXT DEFAULT 'announcement',
    p_priority TEXT DEFAULT 'normal',
    p_target_audience TEXT DEFAULT 'all',
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(
    notice_id UUID,
    notifications_created INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_notice_id UUID;
    v_notification_count INTEGER := 0;
    v_portal_account_id UUID;
    v_current_user_id UUID;
BEGIN
    -- Get the current user ID
    v_current_user_id := auth.uid();

    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to broadcast notices';
    END IF;

    -- Get the portal account for the current user (checking if they have permission)
    SELECT id INTO v_portal_account_id
    FROM public.portal_accounts
    WHERE auth_user_id = v_current_user_id
    AND role IN ('admin', 'compliance_officer')
    LIMIT 1;

    IF v_portal_account_id IS NULL THEN
        RAISE EXCEPTION 'User does not have permission to broadcast notices';
    END IF;

    -- Create the system notice
    INSERT INTO public.system_notices (
        title,
        content,
        notice_type,
        priority,
        target_audience,
        is_published,
        published_at,
        published_by,
        broadcast_at,
        broadcast_by,
        metadata
    ) VALUES (
        p_title,
        p_content,
        p_notice_type,
        p_priority,
        p_target_audience,
        true,
        NOW(),
        v_portal_account_id,
        NOW(),
        v_portal_account_id,
        p_metadata
    )
    RETURNING id INTO v_notice_id;

    -- Create user notifications based on target audience
    IF p_target_audience = 'all' THEN
        -- Send to all users with profiles
        INSERT INTO public.user_notifications (
            user_id,
            notification_type,
            title,
            content,
            priority,
            notice_id,
            related_notice_id,
            metadata
        )
        SELECT
            p.id,
            'system_notice',
            p_title,
            p_content,
            p_priority,
            v_notice_id,
            v_notice_id,
            jsonb_build_object(
                'notice_type', p_notice_type,
                'broadcast_time', NOW(),
                'broadcast_by', v_portal_account_id
            ) || COALESCE(p_metadata, '{}'::JSONB)
        FROM public.profiles p
        WHERE p.id IS NOT NULL
        ON CONFLICT DO NOTHING;

        GET DIAGNOSTICS v_notification_count = ROW_COUNT;

    ELSIF p_target_audience = 'investors' THEN
        -- Send to users with equity transactions
        INSERT INTO public.user_notifications (
            user_id,
            notification_type,
            title,
            content,
            priority,
            notice_id,
            related_notice_id,
            metadata
        )
        SELECT DISTINCT
            et.user_id,
            'system_notice',
            p_title,
            p_content,
            p_priority,
            v_notice_id,
            v_notice_id,
            jsonb_build_object(
                'notice_type', p_notice_type,
                'broadcast_time', NOW(),
                'broadcast_by', v_portal_account_id
            ) || COALESCE(p_metadata, '{}'::JSONB)
        FROM public.equity_transactions et
        WHERE et.user_id IS NOT NULL
        ON CONFLICT DO NOTHING;

        GET DIAGNOSTICS v_notification_count = ROW_COUNT;

    ELSIF p_target_audience = 'premium' THEN
        -- Send to premium users
        INSERT INTO public.user_notifications (
            user_id,
            notification_type,
            title,
            content,
            priority,
            notice_id,
            related_notice_id,
            metadata
        )
        SELECT DISTINCT
            s.user_id,
            'system_notice',
            p_title,
            p_content,
            p_priority,
            v_notice_id,
            v_notice_id,
            jsonb_build_object(
                'notice_type', p_notice_type,
                'broadcast_time', NOW(),
                'broadcast_by', v_portal_account_id
            ) || COALESCE(p_metadata, '{}'::JSONB)
        FROM public.subscriptions s
        WHERE s.user_id IS NOT NULL
        AND s.status = 'active'
        ON CONFLICT DO NOTHING;

        GET DIAGNOSTICS v_notification_count = ROW_COUNT;
    END IF;

    RETURN QUERY
    SELECT v_notice_id, v_notification_count;
END;
$$;

-- Create improved get_user_notifications function
CREATE OR REPLACE FUNCTION public.get_user_notifications(
    p_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_include_read BOOLEAN DEFAULT true,
    p_include_dismissed BOOLEAN DEFAULT false
)
RETURNS TABLE(
    id UUID,
    notice_id UUID,
    notification_type TEXT,
    priority TEXT,
    title TEXT,
    content TEXT,
    metadata JSONB,
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    time_group TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Use provided user_id or current authenticated user
    v_user_id := COALESCE(p_user_id, auth.uid());

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID required to fetch notifications';
    END IF;

    RETURN QUERY
    WITH notifications AS (
        SELECT
            n.id,
            COALESCE(n.notice_id, n.related_notice_id) AS notice_id,
            n.notification_type,
            n.priority,
            n.title,
            n.content,
            n.metadata,
            n.read_at,
            n.dismissed_at,
            n.created_at,
            CASE
                WHEN DATE(n.created_at) = CURRENT_DATE THEN 'Today'
                WHEN DATE(n.created_at) = CURRENT_DATE - INTERVAL '1 day' THEN 'Yesterday'
                WHEN DATE(n.created_at) >= CURRENT_DATE - INTERVAL '7 days' THEN 'This Week'
                WHEN DATE(n.created_at) >= CURRENT_DATE - INTERVAL '30 days' THEN 'This Month'
                ELSE 'Older'
            END AS time_group
        FROM public.user_notifications n
        WHERE n.user_id = v_user_id
        AND (p_include_read = true OR n.read_at IS NULL)
        AND (p_include_dismissed = true OR n.dismissed_at IS NULL)
    )
    SELECT
        notifications.id,
        notifications.notice_id,
        notifications.notification_type,
        notifications.priority,
        notifications.title,
        notifications.content,
        notifications.metadata,
        notifications.read_at,
        notifications.dismissed_at,
        notifications.created_at,
        notifications.time_group
    FROM notifications
    ORDER BY
        CASE notifications.priority
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
        END,
        notifications.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Create improved get_unread_notification_count function
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(
    p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_user_id UUID;
    v_count INTEGER;
BEGIN
    -- Use provided user_id or current authenticated user
    v_user_id := COALESCE(p_user_id, auth.uid());

    IF v_user_id IS NULL THEN
        RETURN 0;
    END IF;

    SELECT COUNT(*)::INTEGER INTO v_count
    FROM public.user_notifications
    WHERE user_id = v_user_id
    AND read_at IS NULL
    AND dismissed_at IS NULL;

    RETURN COALESCE(v_count, 0);
END;
$$;

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.broadcast_system_notice TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_accounts ENABLE ROW LEVEL SECURITY;

-- Create or replace RLS policies with better permissions
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.user_notifications;

-- User notifications policies
CREATE POLICY "Users can view their own notifications"
ON public.user_notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.user_notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
ON public.user_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- System notices policies (ensure they exist)
DROP POLICY IF EXISTS "Portal users can view all notices" ON public.system_notices;
DROP POLICY IF EXISTS "Anyone can view published system notices" ON public.system_notices;

CREATE POLICY "Authenticated users can view published notices"
ON public.system_notices
FOR SELECT
TO authenticated
USING (is_published = true);

CREATE POLICY "Portal users can view all notices"
ON public.system_notices
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.portal_accounts
        WHERE auth_user_id = auth.uid()
    )
);

-- Add helpful indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
ON public.user_notifications(user_id, read_at)
WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
ON public.user_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_notices_published
ON public.system_notices(is_published, published_at DESC)
WHERE is_published = true;

-- Add comment for documentation
COMMENT ON FUNCTION public.broadcast_system_notice IS 'Broadcasts a system notice to specified users. Returns the notice ID and count of notifications created.';
COMMENT ON FUNCTION public.get_user_notifications IS 'Retrieves notifications for a user with filtering and pagination options.';
COMMENT ON FUNCTION public.get_unread_notification_count IS 'Returns the count of unread notifications for a user.';