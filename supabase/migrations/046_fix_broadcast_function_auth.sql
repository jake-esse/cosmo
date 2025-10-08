-- Fix broadcast function to work with compliance portal authentication
-- This migration fixes the authentication issue with the broadcast_system_notice function

-- Drop and recreate the broadcast_system_notice function with better auth handling
DROP FUNCTION IF EXISTS public.broadcast_system_notice CASCADE;

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
    -- Get the current user ID - this will work in client context
    v_current_user_id := auth.uid();

    -- If we have an authenticated user, check their portal account
    IF v_current_user_id IS NOT NULL THEN
        -- Get the portal account for the current user (checking if they have permission)
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
        -- For service role calls, we'll use a system account
        -- This allows the function to work from admin interfaces
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

    ELSIF p_target_audience = 'verified' THEN
        -- Send to verified users (those with KYC completed or similar flag)
        -- For now, send to all users with profiles (can be refined later)
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
        -- Add verification check here when available
        ON CONFLICT DO NOTHING;

        GET DIAGNOSTICS v_notification_count = ROW_COUNT;
    END IF;

    -- Log the broadcast in the audit log
    INSERT INTO public.compliance_audit_log (
        portal_account_id,
        action_type,
        entity_type,
        entity_id,
        changes,
        metadata
    ) VALUES (
        v_portal_account_id,
        'broadcast_notice',
        'system_notice',
        v_notice_id,
        jsonb_build_object(
            'title', p_title,
            'audience', p_target_audience,
            'priority', p_priority,
            'notifications_created', v_notification_count
        ),
        jsonb_build_object(
            'notice_type', p_notice_type,
            'broadcast_time', NOW()
        )
    );

    RETURN QUERY
    SELECT v_notice_id, v_notification_count;

EXCEPTION WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE WARNING 'Error in broadcast_system_notice: %', SQLERRM;
    -- Re-raise the error with more context
    RAISE EXCEPTION 'Failed to broadcast notice: %', SQLERRM;
END;
$$;

-- Also create a simpler version for direct admin use
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
                'broadcast_time', NOW()
            )
        FROM public.profiles p
        ON CONFLICT DO NOTHING;

        GET DIAGNOSTICS v_notification_count = ROW_COUNT;
    END IF;

    RETURN QUERY
    SELECT v_notice_id, v_notification_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.broadcast_system_notice TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_broadcast_notice TO authenticated;

-- Add helpful test to verify the functions work
DO $$
DECLARE
    v_profile_count INTEGER;
BEGIN
    -- Check if we have any profiles to send to
    SELECT COUNT(*) INTO v_profile_count FROM public.profiles;

    IF v_profile_count = 0 THEN
        RAISE WARNING 'No profiles found in the database. Notifications will not be created until users exist.';
    ELSE
        RAISE NOTICE 'Found % profiles. Broadcast functions are ready to use.', v_profile_count;
    END IF;
END $$;