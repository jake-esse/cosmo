-- Migration: Fix System Notices View Policies
-- Purpose: Ensure compliance users can properly view system notices
-- Date: 2025-01-18

-- First, let's check if RLS is enabled (it should be from migration 042)
ALTER TABLE public.system_notices ENABLE ROW LEVEL SECURITY;

-- Drop all existing SELECT policies to start fresh
DROP POLICY IF EXISTS "Anyone can view published notices" ON public.system_notices;
DROP POLICY IF EXISTS "Portal accounts can view all notices" ON public.system_notices;

-- Create a more permissive policy for compliance portal users
-- This allows any authenticated user with a portal account to view ALL notices
CREATE POLICY "Portal users can view all notices" ON public.system_notices
    FOR SELECT
    USING (
        -- Check if user has a portal account
        auth.uid() IN (
            SELECT auth_user_id
            FROM public.portal_accounts
            WHERE auth_user_id IS NOT NULL
        )
        OR
        -- OR if the notice is published (for future public viewing)
        is_published = true
    );

-- Also ensure the portal_accounts table has proper RLS for self-viewing
ALTER TABLE public.portal_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing portal_accounts policies if they exist
DROP POLICY IF EXISTS "Compliance users can view own account" ON public.portal_accounts;
DROP POLICY IF EXISTS "Admins can view all portal accounts" ON public.portal_accounts;

-- Allow users to view their own portal account
CREATE POLICY "Users can view own portal account" ON public.portal_accounts
    FOR SELECT
    USING (auth_user_id = auth.uid());

-- Grant necessary permissions
GRANT SELECT ON public.system_notices TO authenticated;
GRANT SELECT ON public.portal_accounts TO authenticated;

-- Also ensure user_notifications table can be queried
GRANT SELECT ON public.user_notifications TO authenticated;