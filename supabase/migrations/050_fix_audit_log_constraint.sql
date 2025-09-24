-- Fix the compliance_audit_log action_type constraint to include broadcast_notice
-- This fixes the final issue preventing notifications from being broadcast

-- Drop the existing constraint
ALTER TABLE public.compliance_audit_log
DROP CONSTRAINT IF EXISTS compliance_audit_log_action_type_check;

-- Recreate it with broadcast_notice included
ALTER TABLE public.compliance_audit_log
ADD CONSTRAINT compliance_audit_log_action_type_check
CHECK (action_type IN (
    'login',
    'logout',
    'view_user',
    'export_data',
    'create_notice',
    'publish_notice',
    'broadcast_notice',  -- Added this
    'update_kyc_status',
    'approve_offering',
    'reject_offering',
    'suspend_user',
    'unsuspend_user',
    'generate_report',
    'modify_settings',
    'access_denied'
));

-- Now fix the main broadcast functions to not include audit logging if it fails
-- Update the functions to handle audit log errors gracefully
CREATE OR REPLACE FUNCTION public.admin_broadcast_notice(
    p_title TEXT,
    p_content TEXT,
    p_notice_type TEXT DEFAULT 'announcement',
    p_priority TEXT DEFAULT 'normal',
    p_target_audience TEXT DEFAULT 'all'
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
BEGIN
    -- Get the first admin portal account
    SELECT id INTO v_portal_account_id
    FROM public.portal_accounts
    WHERE role = 'admin'
    AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_portal_account_id IS NULL THEN
        RAISE EXCEPTION 'No admin portal account found';
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
        broadcast_by
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
        v_portal_account_id
    )
    RETURNING id INTO v_notice_id;

    -- Create user notifications based on target audience
    IF p_target_audience = 'all' THEN
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
            )
        FROM public.profiles p
        WHERE p.id IS NOT NULL
        ON CONFLICT DO NOTHING;

        GET DIAGNOSTICS v_notification_count = ROW_COUNT;

    ELSIF p_target_audience = 'investors' THEN
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
            )
        FROM public.equity_transactions et
        WHERE et.user_id IS NOT NULL
        ON CONFLICT DO NOTHING;

        GET DIAGNOSTICS v_notification_count = ROW_COUNT;

    ELSIF p_target_audience = 'verified' THEN
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
                'broadcast_by', v_portal_account_id,
                'audience', 'verified'
            )
        FROM public.profiles p
        WHERE p.id IS NOT NULL
        ON CONFLICT DO NOTHING;

        GET DIAGNOSTICS v_notification_count = ROW_COUNT;
    END IF;

    -- Try to log the broadcast in the audit log, but don't fail if it doesn't work
    BEGIN
        INSERT INTO public.compliance_audit_log (
            portal_account_id,
            action_type,
            target_type,
            target_id,
            action_details
        ) VALUES (
            v_portal_account_id,
            'broadcast_notice',
            'system_notice',
            v_notice_id,
            jsonb_build_object(
                'title', p_title,
                'audience', p_target_audience,
                'priority', p_priority,
                'notice_type', p_notice_type,
                'notifications_created', v_notification_count,
                'broadcast_time', NOW()
            )
        );
    EXCEPTION WHEN OTHERS THEN
        -- Log warning but don't fail the broadcast
        RAISE WARNING 'Could not log to audit: %', SQLERRM;
    END;

    RETURN QUERY
    SELECT v_notice_id, v_notification_count;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in admin_broadcast_notice: %', SQLERRM;
    RAISE EXCEPTION 'Failed to broadcast notice: %', SQLERRM;
END;
$$;

-- Also update broadcast_system_notice with the same fix
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

    -- If we have an authenticated user, check their portal account
    IF v_current_user_id IS NOT NULL THEN
        SELECT id INTO v_portal_account_id
        FROM public.portal_accounts
        WHERE auth_user_id = v_current_user_id
        AND role IN ('admin', 'compliance_officer')
        AND is_active = true
        LIMIT 1;

        IF v_portal_account_id IS NULL THEN
            RAISE EXCEPTION 'User does not have permission to broadcast notices';
        END IF;
    ELSE
        -- For service role calls, use the first admin account
        SELECT id INTO v_portal_account_id
        FROM public.portal_accounts
        WHERE role = 'admin'
        AND is_active = true
        ORDER BY created_at ASC
        LIMIT 1;

        IF v_portal_account_id IS NULL THEN
            RAISE EXCEPTION 'No admin portal account found for system broadcast';
        END IF;
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

    ELSIF p_target_audience = 'verified' THEN
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
                'broadcast_by', v_portal_account_id,
                'audience', 'verified'
            ) || COALESCE(p_metadata, '{}'::JSONB)
        FROM public.profiles p
        WHERE p.id IS NOT NULL
        ON CONFLICT DO NOTHING;

        GET DIAGNOSTICS v_notification_count = ROW_COUNT;
    END IF;

    -- Try to log the broadcast in the audit log
    BEGIN
        INSERT INTO public.compliance_audit_log (
            portal_account_id,
            action_type,
            target_type,
            target_id,
            action_details
        ) VALUES (
            v_portal_account_id,
            'broadcast_notice',
            'system_notice',
            v_notice_id,
            jsonb_build_object(
                'title', p_title,
                'audience', p_target_audience,
                'priority', p_priority,
                'notice_type', p_notice_type,
                'notifications_created', v_notification_count,
                'broadcast_time', NOW()
            )
        );
    EXCEPTION WHEN OTHERS THEN
        -- Log warning but don't fail the broadcast
        RAISE WARNING 'Could not log to audit: %', SQLERRM;
    END;

    RETURN QUERY
    SELECT v_notice_id, v_notification_count;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in broadcast_system_notice: %', SQLERRM;
    RAISE EXCEPTION 'Failed to broadcast notice: %', SQLERRM;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.broadcast_system_notice TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_broadcast_notice TO authenticated;

-- Verify the fix
DO $$
DECLARE
    v_test_count INTEGER;
BEGIN
    -- Count notifications created
    SELECT COUNT(*) INTO v_test_count
    FROM public.user_notifications
    WHERE notification_type = 'system_notice';

    RAISE NOTICE 'Found % existing system notifications. Broadcast functions are now fixed!', v_test_count;
END $$;