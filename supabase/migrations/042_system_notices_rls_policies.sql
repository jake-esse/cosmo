-- Migration: System Notices RLS Policies
-- Purpose: Enable RLS and add proper policies for system_notices table
-- Date: 2025-01-18
-- Note: This is a fresh migration to avoid any versioning issues

-- First, let's check and add any missing columns
ALTER TABLE public.system_notices
ADD COLUMN IF NOT EXISTS broadcast_at TIMESTAMPTZ;

ALTER TABLE public.system_notices
ADD COLUMN IF NOT EXISTS broadcast_by UUID;

-- Enable RLS on system_notices if not already enabled
ALTER TABLE public.system_notices ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DO $$
BEGIN
    -- Drop any existing policies on system_notices
    DROP POLICY IF EXISTS "Compliance users can view notices" ON public.system_notices;
    DROP POLICY IF EXISTS "Compliance users can create notices" ON public.system_notices;
    DROP POLICY IF EXISTS "Compliance users can update notices" ON public.system_notices;
    DROP POLICY IF EXISTS "Users can view active notices" ON public.system_notices;
    DROP POLICY IF EXISTS "Users can view published notices" ON public.system_notices;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Create a simple, permissive policy first to test
-- Policy 1: Everyone can view published notices
CREATE POLICY "Anyone can view published notices" ON public.system_notices
    FOR SELECT
    USING (is_published = true);

-- Policy 2: Portal accounts can view all notices
CREATE POLICY "Portal accounts can view all notices" ON public.system_notices
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.portal_accounts AS pa
            WHERE pa.auth_user_id = auth.uid()
        )
    );

-- Policy 3: Portal accounts can create notices (admin and compliance_officer only)
CREATE POLICY "Portal accounts can create notices" ON public.system_notices
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.portal_accounts AS pa
            WHERE pa.auth_user_id = auth.uid()
            AND pa.role IN ('admin', 'compliance_officer')
        )
    );

-- Policy 4: Portal accounts can update notices (admin and compliance_officer only)
CREATE POLICY "Portal accounts can update notices" ON public.system_notices
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM public.portal_accounts AS pa
            WHERE pa.auth_user_id = auth.uid()
            AND pa.role IN ('admin', 'compliance_officer')
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.system_notices TO authenticated;

-- Drop ALL existing versions of the function
DROP FUNCTION IF EXISTS public.broadcast_system_notice(TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.broadcast_system_notice(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.broadcast_system_notice CASCADE;

-- Create the broadcast function (new version)
CREATE FUNCTION public.broadcast_system_notice(
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
    -- Get the portal account for the current user (without checking is_active)
    SELECT id INTO v_portal_account_id
    FROM public.portal_accounts
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

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
        -- Send to all users
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
            p_priority,
            v_notice_id,
            jsonb_build_object(
                'notice_type', p_notice_type,
                'broadcast_time', NOW()
            ) || p_metadata
        FROM public.profiles p
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
            jsonb_build_object(
                'notice_type', p_notice_type,
                'broadcast_time', NOW()
            ) || p_metadata
        FROM public.equity_transactions et
        ON CONFLICT DO NOTHING;

        GET DIAGNOSTICS v_notification_count = ROW_COUNT;
    END IF;

    RETURN QUERY
    SELECT v_notice_id, v_notification_count;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.broadcast_system_notice TO authenticated;