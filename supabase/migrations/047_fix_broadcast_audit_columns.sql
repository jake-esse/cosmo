-- Fix the broadcast functions to use correct column names for compliance_audit_log
-- This fixes the "record has no field notice_type" error

-- Drop and recreate the functions with correct column names
DROP FUNCTION IF EXISTS public.broadcast_system_notice CASCADE;
DROP FUNCTION IF EXISTS public.admin_broadcast_notice CASCADE;

-- Create corrected broadcast_system_notice function
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

    -- Log the broadcast in the audit log with CORRECT column names
    INSERT INTO public.compliance_audit_log (
        portal_account_id,
        action_type,
        target_type,  -- Changed from entity_type
        target_id,    -- Changed from entity_id
        action_details -- Changed from changes/metadata
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

    RETURN QUERY
    SELECT v_notice_id, v_notification_count;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in broadcast_system_notice: %', SQLERRM;
    RAISE EXCEPTION 'Failed to broadcast notice: %', SQLERRM;
END;
$$;

-- Create corrected admin_broadcast_notice function
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

    -- Log the broadcast in the audit log with CORRECT column names
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

    RETURN QUERY
    SELECT v_notice_id, v_notification_count;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in admin_broadcast_notice: %', SQLERRM;
    RAISE EXCEPTION 'Failed to broadcast notice: %', SQLERRM;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.broadcast_system_notice TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_broadcast_notice TO authenticated;

-- Test that we have profiles to send to
DO $$
DECLARE
    v_profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_profile_count FROM public.profiles;
    RAISE NOTICE 'Found % profiles in the database. Ready to broadcast notifications.', v_profile_count;
END $$;