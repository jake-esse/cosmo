-- Create a simplified broadcast function that bypasses potential trigger issues
-- This is a debugging migration to isolate the problem

-- First, let's temporarily disable the trigger to test
ALTER TABLE public.user_notifications DISABLE TRIGGER trigger_notify_new_notification;

-- Create a super simple broadcast function for testing
CREATE OR REPLACE FUNCTION public.simple_broadcast_test(
    p_title TEXT,
    p_content TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
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
    v_profile_count INTEGER;
BEGIN
    -- Simple logging
    RAISE NOTICE 'Starting simple_broadcast_test with title: %', p_title;

    -- Get admin portal account
    SELECT id INTO v_portal_account_id
    FROM public.portal_accounts
    WHERE role = 'admin'
    AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_portal_account_id IS NULL THEN
        RETURN QUERY SELECT false, 'No admin portal account found', NULL::UUID, 0;
        RETURN;
    END IF;

    -- Count profiles
    SELECT COUNT(*) INTO v_profile_count FROM public.profiles;
    RAISE NOTICE 'Found % profiles', v_profile_count;

    -- Create system notice
    BEGIN
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
            'announcement',
            'normal',
            'all',
            true,
            NOW(),
            v_portal_account_id,
            NOW(),
            v_portal_account_id
        )
        RETURNING id INTO v_notice_id;

        RAISE NOTICE 'Created system notice with ID: %', v_notice_id;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT false, 'Failed to create system notice: ' || SQLERRM, NULL::UUID, 0;
        RETURN;
    END;

    -- Create notifications WITHOUT using the trigger
    BEGIN
        INSERT INTO public.user_notifications (
            user_id,
            notification_type,
            title,
            content,
            priority,
            related_notice_id,
            metadata
        )
        SELECT
            p.id,
            'system_notice',
            p_title,
            p_content,
            'normal',
            v_notice_id,
            jsonb_build_object(
                'broadcast_time', NOW()::text,
                'broadcast_by', v_portal_account_id::text
            )
        FROM public.profiles p
        WHERE p.id IS NOT NULL;

        GET DIAGNOSTICS v_notification_count = ROW_COUNT;

        RAISE NOTICE 'Created % notifications', v_notification_count;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT false, 'Failed to create notifications: ' || SQLERRM, v_notice_id, 0;
        RETURN;
    END;

    -- Return success
    RETURN QUERY SELECT true, 'Successfully broadcast to ' || v_notification_count || ' users', v_notice_id, v_notification_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.simple_broadcast_test TO authenticated;

-- Re-enable the trigger after testing
ALTER TABLE public.user_notifications ENABLE TRIGGER trigger_notify_new_notification;

-- Also, let's check if the notice_id column exists and add it if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_notifications'
        AND column_name = 'notice_id'
    ) THEN
        ALTER TABLE public.user_notifications
        ADD COLUMN notice_id UUID REFERENCES public.system_notices(id);

        -- Copy data from related_notice_id if it exists
        UPDATE public.user_notifications
        SET notice_id = related_notice_id
        WHERE notice_id IS NULL AND related_notice_id IS NOT NULL;

        RAISE NOTICE 'Added notice_id column to user_notifications';
    END IF;
END $$;