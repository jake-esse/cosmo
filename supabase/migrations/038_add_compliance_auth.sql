-- Migration: Add Compliance Portal Authentication
-- Purpose: Link portal_accounts to Supabase auth users and add authorization functions
-- Date: 2025-01-17

-- ============================================================================
-- ALTER PORTAL ACCOUNTS TABLE
-- ============================================================================
-- Add auth_user_id to link with Supabase Auth
ALTER TABLE public.portal_accounts
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) UNIQUE;

-- Add metadata for better tracking
ALTER TABLE public.portal_accounts
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for auth lookups
CREATE INDEX IF NOT EXISTS idx_portal_accounts_auth_user_id
ON public.portal_accounts(auth_user_id)
WHERE auth_user_id IS NOT NULL;

-- ============================================================================
-- AUTHORIZATION FUNCTIONS
-- ============================================================================

-- Function to check if a user has compliance portal access
CREATE OR REPLACE FUNCTION public.check_compliance_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.portal_accounts
        WHERE auth_user_id = p_user_id
        AND is_active = true
    );
END;
$$;

-- Function to get compliance user details
CREATE OR REPLACE FUNCTION public.get_compliance_user(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    permissions JSONB,
    is_active BOOLEAN,
    last_login_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pa.id,
        pa.email,
        pa.full_name,
        pa.role,
        pa.permissions,
        pa.is_active,
        pa.last_login_at
    FROM public.portal_accounts pa
    WHERE pa.auth_user_id = p_user_id
    AND pa.is_active = true
    LIMIT 1;
END;
$$;

-- Function to create a new portal account with auth user
CREATE OR REPLACE FUNCTION public.create_portal_account(
    p_auth_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_role TEXT DEFAULT 'viewer',
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_account_id UUID;
BEGIN
    -- Check if account already exists
    SELECT id INTO v_account_id
    FROM public.portal_accounts
    WHERE auth_user_id = p_auth_user_id OR email = p_email;

    IF v_account_id IS NOT NULL THEN
        RAISE EXCEPTION 'Portal account already exists for this user';
    END IF;

    -- Create new portal account
    INSERT INTO public.portal_accounts (
        auth_user_id,
        email,
        full_name,
        role,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        p_auth_user_id,
        p_email,
        p_full_name,
        p_role,
        p_created_by,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_account_id;

    -- Log the creation
    INSERT INTO public.compliance_audit_log (
        portal_account_id,
        action_type,
        action_details,
        ip_address,
        user_agent
    ) VALUES (
        v_account_id,
        'account_created',
        jsonb_build_object(
            'email', p_email,
            'role', p_role,
            'created_by', p_created_by
        ),
        '0.0.0.0'::inet,
        'System'
    );

    RETURN v_account_id;
END;
$$;

-- Function to update last login
CREATE OR REPLACE FUNCTION public.update_compliance_login(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.portal_accounts
    SET
        last_login_at = NOW(),
        login_count = COALESCE(login_count, 0) + 1,
        updated_at = NOW()
    WHERE auth_user_id = p_user_id
    AND is_active = true;
END;
$$;

-- Function to check specific permission
CREATE OR REPLACE FUNCTION public.check_compliance_permission(
    p_user_id UUID,
    p_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
    v_permissions JSONB;
BEGIN
    SELECT role, permissions
    INTO v_role, v_permissions
    FROM public.portal_accounts
    WHERE auth_user_id = p_user_id
    AND is_active = true;

    -- Admin has all permissions
    IF v_role = 'admin' THEN
        RETURN true;
    END IF;

    -- Check role-based permissions
    IF v_role = 'compliance_officer' AND p_permission IN (
        'create_notices', 'broadcast_notices', 'export_data', 'view_analytics'
    ) THEN
        RETURN true;
    END IF;

    IF v_role = 'auditor' AND p_permission IN (
        'view_notices', 'export_data', 'view_analytics'
    ) THEN
        RETURN true;
    END IF;

    IF v_role = 'viewer' AND p_permission IN (
        'view_notices', 'view_analytics'
    ) THEN
        RETURN true;
    END IF;

    -- Check custom permissions in JSONB
    IF v_permissions IS NOT NULL AND v_permissions ? p_permission THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

-- ============================================================================
-- COMPLIANCE METRICS FUNCTIONS
-- ============================================================================

-- Function to get compliance dashboard metrics
CREATE OR REPLACE FUNCTION public.get_compliance_metrics()
RETURNS TABLE (
    total_users BIGINT,
    active_participants BIGINT,
    notifications_this_week BIGINT,
    recent_exports BIGINT,
    unread_notifications BIGINT,
    critical_notices BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.profiles)::BIGINT as total_users,
        (SELECT COUNT(*) FROM public.profiles WHERE last_activity_at > NOW() - INTERVAL '30 days')::BIGINT as active_participants,
        (SELECT COUNT(*) FROM public.user_notifications WHERE created_at > NOW() - INTERVAL '7 days')::BIGINT as notifications_this_week,
        (SELECT COUNT(*) FROM public.compliance_exports WHERE created_at > NOW() - INTERVAL '30 days')::BIGINT as recent_exports,
        (SELECT COUNT(*) FROM public.user_notifications WHERE read_at IS NULL)::BIGINT as unread_notifications,
        (SELECT COUNT(*) FROM public.system_notices WHERE priority = 'critical' AND created_at > NOW() - INTERVAL '7 days')::BIGINT as critical_notices;
END;
$$;

-- Function to get recent compliance activity
CREATE OR REPLACE FUNCTION public.get_recent_compliance_activity(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    activity_type TEXT,
    description TEXT,
    created_at TIMESTAMPTZ,
    metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cal.id,
        cal.action_type as activity_type,
        CASE
            WHEN cal.action_type = 'notice_created' THEN 'Created new system notice'
            WHEN cal.action_type = 'notice_broadcast' THEN 'Broadcast notice to users'
            WHEN cal.action_type = 'data_export' THEN 'Exported compliance data'
            WHEN cal.action_type = 'account_created' THEN 'New compliance account created'
            WHEN cal.action_type = 'permission_changed' THEN 'User permissions updated'
            ELSE cal.action_type
        END as description,
        cal.created_at,
        cal.action_details as metadata
    FROM public.compliance_audit_log cal
    ORDER BY cal.created_at DESC
    LIMIT p_limit;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on portal_accounts
ALTER TABLE public.portal_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Compliance users can view their own account
CREATE POLICY "Compliance users can view own account" ON public.portal_accounts
    FOR SELECT
    USING (auth_user_id = auth.uid());

-- Policy: Admins can view all portal accounts
CREATE POLICY "Admins can view all portal accounts" ON public.portal_accounts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.portal_accounts
            WHERE auth_user_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
    );

-- Policy: Admins can update portal accounts
CREATE POLICY "Admins can update portal accounts" ON public.portal_accounts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.portal_accounts
            WHERE auth_user_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
    );

-- Policy: Admins can insert new portal accounts
CREATE POLICY "Admins can insert portal accounts" ON public.portal_accounts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.portal_accounts
            WHERE auth_user_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
    );

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.check_compliance_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_compliance_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_compliance_login TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_compliance_permission TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_compliance_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_compliance_activity TO authenticated;

-- ============================================================================
-- SEED DATA (Optional - Comment out in production)
-- ============================================================================

-- Create a demo compliance admin account (uncomment to use)
-- INSERT INTO public.portal_accounts (
--     auth_user_id,
--     email,
--     full_name,
--     role,
--     permissions,
--     is_active
-- ) VALUES (
--     'YOUR-AUTH-USER-ID-HERE',  -- Replace with actual auth user ID
--     'admin@cosmo.com',
--     'Compliance Admin',
--     'admin',
--     '["all"]'::jsonb,
--     true
-- ) ON CONFLICT (email) DO NOTHING;