-- Migration: Fix System Notices Permissions
-- Purpose: Enable RLS and add proper policies for system_notices table
-- Date: 2025-01-17

-- Enable RLS on system_notices
ALTER TABLE public.system_notices ENABLE ROW LEVEL SECURITY;

-- Add columns that the UI expects if they don't exist
ALTER TABLE public.system_notices
ADD COLUMN IF NOT EXISTS broadcast_at TIMESTAMPTZ;

ALTER TABLE public.system_notices
ADD COLUMN IF NOT EXISTS broadcast_by UUID REFERENCES public.portal_accounts(id);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Compliance users can view notices" ON public.system_notices;
DROP POLICY IF EXISTS "Compliance users can create notices" ON public.system_notices;
DROP POLICY IF EXISTS "Compliance users can update notices" ON public.system_notices;
DROP POLICY IF EXISTS "Users can view active notices" ON public.system_notices;
DROP POLICY IF EXISTS "Users can view published notices" ON public.system_notices;

-- Policy: All authenticated users can view published system notices
-- OR compliance users can see all notices
CREATE POLICY "Users can view published notices" ON public.system_notices
    FOR SELECT
    USING (
        system_notices.is_published = true
        OR EXISTS (
            SELECT 1
            FROM public.portal_accounts
            WHERE portal_accounts.auth_user_id = auth.uid()
            AND portal_accounts.is_active = true
        )
    );

-- Policy: Compliance users with appropriate role can create notices
CREATE POLICY "Compliance users can create notices" ON public.system_notices
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.portal_accounts
            WHERE portal_accounts.auth_user_id = auth.uid()
            AND portal_accounts.is_active = true
            AND portal_accounts.role IN ('admin', 'compliance_officer')
        )
    );

-- Policy: Compliance users can update notices
CREATE POLICY "Compliance users can update notices" ON public.system_notices
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM public.portal_accounts
            WHERE portal_accounts.auth_user_id = auth.uid()
            AND portal_accounts.is_active = true
            AND portal_accounts.role IN ('admin', 'compliance_officer')
        )
    );

-- Grant necessary permissions
GRANT SELECT ON public.system_notices TO authenticated;
GRANT INSERT, UPDATE ON public.system_notices TO authenticated;

-- Fix or create the broadcast_system_notice function
CREATE OR REPLACE FUNCTION public.broadcast_system_notice(
    p_title TEXT,
    p_content TEXT,
    p_notice_type TEXT DEFAULT 'announcement',
    p_priority TEXT DEFAULT 'normal',
    p_target_audience TEXT DEFAULT 'all',
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    notice_id UUID,
    notifications_created INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notice_id UUID;
    v_notification_count INTEGER := 0;
    v_user_record RECORD;
    v_portal_account_id UUID;
BEGIN
    -- Get the portal account for the current user
    SELECT id INTO v_portal_account_id
    FROM public.portal_accounts
    WHERE auth_user_id = auth.uid()
    AND is_active = true
    LIMIT 1;

    -- Create or get system notice
    SELECT id INTO v_notice_id
    FROM public.system_notices
    WHERE title = p_title
    AND content = p_content
    AND created_at > NOW() - INTERVAL '1 minute';

    IF v_notice_id IS NULL THEN
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
    END IF;

    -- Create user notifications based on target audience
    IF p_target_audience = 'all' THEN
        -- Send to all users
        FOR v_user_record IN
            SELECT id FROM public.profiles
        LOOP
            BEGIN
                INSERT INTO public.user_notifications (
                    user_id,
                    notification_type,
                    title,
                    content,
                    priority,
                    related_notice_id,
                    metadata
                ) VALUES (
                    v_user_record.id,
                    'system_notice',
                    p_title,
                    p_content,
                    p_priority,
                    v_notice_id,
                    jsonb_build_object(
                        'notice_type', p_notice_type,
                        'broadcast_time', NOW()
                    ) || p_metadata
                );

                v_notification_count := v_notification_count + 1;
            EXCEPTION WHEN unique_violation THEN
                -- Skip duplicate notifications
                NULL;
            END;
        END LOOP;

    ELSIF p_target_audience = 'investors' THEN
        -- Send to users with equity transactions
        FOR v_user_record IN
            SELECT DISTINCT user_id as id
            FROM public.equity_transactions
        LOOP
            BEGIN
                INSERT INTO public.user_notifications (
                    user_id,
                    notification_type,
                    title,
                    content,
                    priority,
                    related_notice_id,
                    metadata
                ) VALUES (
                    v_user_record.id,
                    'system_notice',
                    p_title,
                    p_content,
                    p_priority,
                    v_notice_id,
                    jsonb_build_object(
                        'notice_type', p_notice_type,
                        'broadcast_time', NOW()
                    ) || p_metadata
                );

                v_notification_count := v_notification_count + 1;
            EXCEPTION WHEN unique_violation THEN
                -- Skip duplicate notifications
                NULL;
            END;
        END LOOP;
    END IF;

    RETURN QUERY
    SELECT v_notice_id, v_notification_count;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.broadcast_system_notice TO authenticated;