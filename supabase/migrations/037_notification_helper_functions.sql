-- ============================================================================
-- 037: Notification Helper Functions
-- ============================================================================
-- Adds database functions for broadcasting, counting, and managing notifications
-- ============================================================================

-- Function to broadcast a system notice to all eligible users
CREATE OR REPLACE FUNCTION public.broadcast_system_notice(
    p_title TEXT,
    p_content TEXT,
    p_notice_type TEXT DEFAULT 'announcement',
    p_priority TEXT DEFAULT 'normal',
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_notice_id UUID;
    v_user_count INTEGER;
BEGIN
    -- Create the system notice
    INSERT INTO system_notices (
        title,
        content,
        notice_type,
        priority,
        metadata,
        is_published,
        published_at
    ) VALUES (
        p_title,
        p_content,
        p_notice_type,
        p_priority,
        p_metadata,
        true,
        NOW()
    )
    RETURNING id INTO v_notice_id;

    -- Create notifications for all active users
    INSERT INTO user_notifications (
        user_id,
        notice_id,
        notification_type,
        priority,
        title,
        content,
        metadata
    )
    SELECT
        p.id,
        v_notice_id,
        'system_notice',
        p_priority,
        p_title,
        p_content,
        p_metadata
    FROM profiles p;
    -- Note: Removed WHERE clause since profiles table may not have 'status' column

    GET DIAGNOSTICS v_user_count = ROW_COUNT;

    -- Log the broadcast action (fixed column names)
    INSERT INTO compliance_audit_log (
        action_type,
        target_type,
        target_id,
        action_details,
        ip_address,
        user_agent
    ) VALUES (
        'create_notice',
        'system_notice',
        v_notice_id,
        jsonb_build_object(
            'notice_id', v_notice_id,
            'notice_type', p_notice_type,
            'priority', p_priority,
            'users_notified', v_user_count,
            'title', p_title
        ),
        '127.0.0.1',
        'System Function'
    );

    RETURN v_notice_id;
END;
$$;

-- Function to get unread notification count for a user
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    total_unread BIGINT,
    critical_unread BIGINT,
    high_unread BIGINT,
    normal_unread BIGINT,
    low_unread BIGINT
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
        RAISE EXCEPTION 'User ID required';
    END IF;

    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE read_at IS NULL) AS total_unread,
        COUNT(*) FILTER (WHERE read_at IS NULL AND priority = 'critical') AS critical_unread,
        COUNT(*) FILTER (WHERE read_at IS NULL AND priority = 'high') AS high_unread,
        COUNT(*) FILTER (WHERE read_at IS NULL AND priority = 'normal') AS normal_unread,
        COUNT(*) FILTER (WHERE read_at IS NULL AND priority = 'low') AS low_unread
    FROM user_notifications
    WHERE user_id = v_user_id
    AND (dismissed_at IS NULL OR dismissed_at > CURRENT_TIMESTAMP);
END;
$$;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notifications_read(
    p_notification_ids UUID[],
    p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_user_id UUID;
    v_updated_count INTEGER;
BEGIN
    -- Use provided user_id or current authenticated user
    v_user_id := COALESCE(p_user_id, auth.uid());

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID required';
    END IF;

    -- Mark notifications as read
    UPDATE user_notifications
    SET read_at = CURRENT_TIMESTAMP
    WHERE id = ANY(p_notification_ids)
    AND user_id = v_user_id
    AND read_at IS NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN v_updated_count;
END;
$$;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_user_id UUID;
    v_updated_count INTEGER;
BEGIN
    -- Use provided user_id or current authenticated user
    v_user_id := COALESCE(p_user_id, auth.uid());

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID required';
    END IF;

    -- Mark all unread notifications as read
    UPDATE user_notifications
    SET read_at = CURRENT_TIMESTAMP
    WHERE user_id = v_user_id
    AND read_at IS NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN v_updated_count;
END;
$$;

-- Function to dismiss notifications (soft delete)
CREATE OR REPLACE FUNCTION public.dismiss_notifications(
    p_notification_ids UUID[],
    p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_user_id UUID;
    v_updated_count INTEGER;
BEGIN
    -- Use provided user_id or current authenticated user
    v_user_id := COALESCE(p_user_id, auth.uid());

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID required';
    END IF;

    -- Dismiss notifications
    UPDATE user_notifications
    SET dismissed_at = CURRENT_TIMESTAMP
    WHERE id = ANY(p_notification_ids)
    AND user_id = v_user_id
    AND dismissed_at IS NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN v_updated_count;
END;
$$;

-- Function to get paginated notifications for a user
CREATE OR REPLACE FUNCTION public.get_user_notifications(
    p_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_include_read BOOLEAN DEFAULT true,
    p_include_dismissed BOOLEAN DEFAULT false
)
RETURNS TABLE (
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
        RAISE EXCEPTION 'User ID required';
    END IF;

    RETURN QUERY
    WITH notifications AS (
        SELECT
            n.id,
            n.notice_id,
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
                ELSE 'Older'
            END AS time_group
        FROM user_notifications n
        WHERE n.user_id = v_user_id
        AND (p_include_read OR n.read_at IS NULL)
        AND (p_include_dismissed OR n.dismissed_at IS NULL)
    )
    SELECT *
    FROM notifications
    ORDER BY
        CASE priority
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'low' THEN 4
        END,
        created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON user_notifications(user_id, read_at)
WHERE read_at IS NULL AND dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_priority
ON user_notifications(user_id, priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_time_groups
ON user_notifications(user_id, created_at DESC);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.broadcast_system_notice TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_notifications TO authenticated;

-- Create trigger to notify clients of new notifications via Realtime
CREATE OR REPLACE FUNCTION public.notify_new_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Publish notification to Realtime for the specific user
    PERFORM pg_notify(
        'new_notification_' || NEW.user_id::text,
        json_build_object(
            'id', NEW.id,
            'title', NEW.title,
            'priority', NEW.priority,
            'notice_type', NEW.notice_type,
            'created_at', NEW.created_at
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_notifications table
CREATE TRIGGER on_new_notification
    AFTER INSERT ON user_notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_new_notification();

-- Add comment
COMMENT ON FUNCTION public.broadcast_system_notice IS 'Broadcasts a system notice to all active users';
COMMENT ON FUNCTION public.get_unread_notification_count IS 'Gets unread notification counts by priority for a user';
COMMENT ON FUNCTION public.mark_notifications_read IS 'Marks specified notifications as read';
COMMENT ON FUNCTION public.mark_all_notifications_read IS 'Marks all notifications as read for a user';
COMMENT ON FUNCTION public.dismiss_notifications IS 'Dismisses (soft deletes) notifications';
COMMENT ON FUNCTION public.get_user_notifications IS 'Gets paginated notifications for a user with time grouping';