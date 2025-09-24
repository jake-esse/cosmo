-- Migration: Fix Broadcast Function Permissions
-- Purpose: Ensure broadcast_system_notice function can be executed
-- Date: 2025-01-18

-- Grant execute permission on the broadcast function to authenticated users
GRANT EXECUTE ON FUNCTION public.broadcast_system_notice(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Also ensure the function can insert into user_notifications
GRANT INSERT ON public.user_notifications TO authenticated;

-- Ensure RLS is enabled on user_notifications
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.user_notifications;

-- Create policy for users to view their own notifications
CREATE POLICY "Users can view own notifications" ON public.user_notifications
    FOR SELECT
    USING (user_id = auth.uid());

-- Create policy to allow the broadcast function to insert notifications
-- Since the function runs with SECURITY DEFINER, it bypasses RLS
-- But we'll add a permissive INSERT policy for safety
CREATE POLICY "Authenticated can insert notifications" ON public.user_notifications
    FOR INSERT
    WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.user_notifications TO authenticated;