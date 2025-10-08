-- Migration: Compliance Portal and Notification System
-- Purpose: Create comprehensive compliance portal tables with notification system
-- Date: 2025-01-17

-- ============================================================================
-- PORTAL ACCOUNTS TABLE
-- ============================================================================
-- Tracks compliance administrator accounts with access to the portal
CREATE TABLE IF NOT EXISTS public.portal_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'compliance_officer', 'auditor', 'viewer')),
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    deactivated_at TIMESTAMPTZ,
    deactivation_reason TEXT,
    password_hash TEXT, -- For future internal auth if needed
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret TEXT,
    created_by UUID REFERENCES public.portal_accounts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for email lookups
CREATE INDEX idx_portal_accounts_email ON public.portal_accounts(email);
CREATE INDEX idx_portal_accounts_is_active ON public.portal_accounts(is_active);

-- ============================================================================
-- SYSTEM NOTICES TABLE
-- ============================================================================
-- Platform-wide announcements and regulatory notices
CREATE TABLE IF NOT EXISTS public.system_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    notice_type TEXT NOT NULL CHECK (notice_type IN (
        'announcement',
        'regulatory_update',
        'maintenance',
        'security_alert',
        'offering_update',
        'terms_update',
        'feature_release'
    )),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN (
        'all',
        'investors',
        'non_investors',
        'specific_users',
        'tier_free',
        'tier_plus',
        'tier_pro'
    )),
    target_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
    display_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    display_until TIMESTAMPTZ,
    requires_acknowledgment BOOLEAN DEFAULT false,
    is_dismissible BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT false,
    published_by UUID REFERENCES public.portal_accounts(id),
    published_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES public.portal_accounts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_system_notices_published ON public.system_notices(is_published);
CREATE INDEX idx_system_notices_display_period ON public.system_notices(display_from, display_until);
CREATE INDEX idx_system_notices_notice_type ON public.system_notices(notice_type);
CREATE INDEX idx_system_notices_created_at ON public.system_notices(created_at DESC);

-- ============================================================================
-- USER NOTIFICATIONS TABLE
-- ============================================================================
-- Individual notifications delivered to users
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    notice_id UUID REFERENCES public.system_notices(id),
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'system_notice',
        'account_update',
        'equity_update',
        'compliance_requirement',
        'kyc_status',
        'offering_status',
        'referral_update',
        'subscription_update'
    )),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    action_url TEXT,
    action_text TEXT,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    read_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX idx_user_notifications_read_at ON public.user_notifications(user_id, read_at);
CREATE INDEX idx_user_notifications_created_at ON public.user_notifications(created_at DESC);
CREATE INDEX idx_user_notifications_unread ON public.user_notifications(user_id) WHERE read_at IS NULL;

-- ============================================================================
-- COMPLIANCE AUDIT LOG TABLE
-- ============================================================================
-- Immutable audit trail for all compliance portal actions
CREATE TABLE IF NOT EXISTS public.compliance_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_account_id UUID REFERENCES public.portal_accounts(id),
    action_type TEXT NOT NULL CHECK (action_type IN (
        'login',
        'logout',
        'view_user',
        'export_data',
        'create_notice',
        'publish_notice',
        'update_kyc_status',
        'approve_offering',
        'reject_offering',
        'suspend_user',
        'unsuspend_user',
        'generate_report',
        'modify_settings',
        'access_denied'
    )),
    target_type TEXT,
    target_id UUID,
    action_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit trail queries
CREATE INDEX idx_compliance_audit_log_portal_account ON public.compliance_audit_log(portal_account_id);
CREATE INDEX idx_compliance_audit_log_action_type ON public.compliance_audit_log(action_type);
CREATE INDEX idx_compliance_audit_log_created_at ON public.compliance_audit_log(created_at DESC);
CREATE INDEX idx_compliance_audit_log_target ON public.compliance_audit_log(target_type, target_id);

-- ============================================================================
-- OFFERING PROGRESS TABLE
-- ============================================================================
-- Tracks user participation progress in offerings
CREATE TABLE IF NOT EXISTS public.offering_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    offering_id TEXT NOT NULL DEFAULT 'seed_2025',
    step_completed TEXT NOT NULL CHECK (step_completed IN (
        'account_created',
        'email_verified',
        'education_completed',
        'terms_accepted',
        'kyc_initiated',
        'kyc_submitted',
        'kyc_approved',
        'investment_initiated',
        'investment_completed',
        'shares_issued'
    )),
    step_metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for progress tracking
CREATE INDEX idx_offering_progress_user_id ON public.offering_progress(user_id);
CREATE INDEX idx_offering_progress_offering_id ON public.offering_progress(offering_id);
CREATE INDEX idx_offering_progress_step ON public.offering_progress(step_completed);
CREATE INDEX idx_offering_progress_created_at ON public.offering_progress(created_at DESC);

-- ============================================================================
-- PLATFORM COMMUNICATIONS TABLE
-- ============================================================================
-- Logs all communications sent to users (emails, SMS, etc.)
CREATE TABLE IF NOT EXISTS public.platform_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    communication_type TEXT NOT NULL CHECK (communication_type IN (
        'email',
        'sms',
        'push_notification',
        'in_app_message'
    )),
    channel TEXT NOT NULL, -- e.g., 'sendgrid', 'twilio', 'firebase'
    template_id TEXT,
    subject TEXT,
    content TEXT,
    recipient_address TEXT NOT NULL, -- email or phone number
    status TEXT NOT NULL CHECK (status IN (
        'pending',
        'sent',
        'delivered',
        'failed',
        'bounced',
        'complained'
    )),
    provider_message_id TEXT,
    provider_response JSONB,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    unsubscribed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for communication tracking
CREATE INDEX idx_platform_communications_user_id ON public.platform_communications(user_id);
CREATE INDEX idx_platform_communications_type ON public.platform_communications(communication_type);
CREATE INDEX idx_platform_communications_status ON public.platform_communications(status);
CREATE INDEX idx_platform_communications_created_at ON public.platform_communications(created_at DESC);

-- ============================================================================
-- COMPLIANCE EXPORTS TABLE
-- ============================================================================
-- Tracks all data exports for compliance and regulatory reporting
CREATE TABLE IF NOT EXISTS public.compliance_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_account_id UUID REFERENCES public.portal_accounts(id),
    export_type TEXT NOT NULL CHECK (export_type IN (
        'user_list',
        'investor_list',
        'transaction_history',
        'kyc_report',
        'audit_log',
        'communications_log',
        'regulatory_filing',
        'financial_report'
    )),
    export_format TEXT NOT NULL CHECK (export_format IN ('csv', 'json', 'pdf', 'xlsx')),
    filters_applied JSONB DEFAULT '{}'::jsonb,
    date_range_start TIMESTAMPTZ,
    date_range_end TIMESTAMPTZ,
    record_count INTEGER,
    file_size_bytes BIGINT,
    storage_path TEXT,
    download_url TEXT,
    expires_at TIMESTAMPTZ,
    purpose TEXT,
    recipient_email TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for export tracking
CREATE INDEX idx_compliance_exports_portal_account ON public.compliance_exports(portal_account_id);
CREATE INDEX idx_compliance_exports_type ON public.compliance_exports(export_type);
CREATE INDEX idx_compliance_exports_created_at ON public.compliance_exports(created_at DESC);

-- ============================================================================
-- IMMUTABILITY TRIGGERS
-- ============================================================================

-- Function to prevent updates and deletes
CREATE OR REPLACE FUNCTION prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Updates are not allowed on % table for compliance reasons', TG_TABLE_NAME;
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Deletes are not allowed on % table for compliance reasons', TG_TABLE_NAME;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply immutability to compliance tables
CREATE TRIGGER enforce_compliance_audit_log_immutable
    BEFORE UPDATE OR DELETE ON public.compliance_audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER enforce_offering_progress_immutable
    BEFORE UPDATE OR DELETE ON public.offering_progress
    FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER enforce_platform_communications_immutable
    BEFORE UPDATE OR DELETE ON public.platform_communications
    FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER enforce_compliance_exports_immutable
    BEFORE UPDATE OR DELETE ON public.compliance_exports
    FOR EACH ROW EXECUTE FUNCTION prevent_modification();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for unread notification counts per user
CREATE OR REPLACE VIEW public.user_unread_notifications AS
SELECT
    user_id,
    COUNT(*) FILTER (WHERE read_at IS NULL) as unread_count,
    COUNT(*) FILTER (WHERE read_at IS NULL AND priority = 'critical') as unread_critical,
    COUNT(*) FILTER (WHERE read_at IS NULL AND priority = 'high') as unread_high,
    COUNT(*) FILTER (WHERE read_at IS NULL AND priority = 'normal') as unread_normal,
    COUNT(*) FILTER (WHERE read_at IS NULL AND priority = 'low') as unread_low,
    MAX(created_at) FILTER (WHERE read_at IS NULL) as latest_unread_at
FROM public.user_notifications
GROUP BY user_id;

-- View for active system notices
CREATE OR REPLACE VIEW public.active_system_notices AS
SELECT *
FROM public.system_notices
WHERE is_published = true
  AND display_from <= NOW()
  AND (display_until IS NULL OR display_until > NOW());

-- View for user offering completion status
CREATE OR REPLACE VIEW public.user_offering_status AS
SELECT
    user_id,
    offering_id,
    ARRAY_AGG(DISTINCT step_completed ORDER BY step_completed) as completed_steps,
    COUNT(DISTINCT step_completed) as steps_completed,
    MAX(created_at) as last_progress_at,
    CASE
        WHEN 'shares_issued' = ANY(ARRAY_AGG(step_completed)) THEN 'completed'
        WHEN 'investment_completed' = ANY(ARRAY_AGG(step_completed)) THEN 'invested'
        WHEN 'kyc_approved' = ANY(ARRAY_AGG(step_completed)) THEN 'kyc_complete'
        WHEN 'kyc_submitted' = ANY(ARRAY_AGG(step_completed)) THEN 'kyc_pending'
        WHEN 'terms_accepted' = ANY(ARRAY_AGG(step_completed)) THEN 'terms_accepted'
        WHEN 'education_completed' = ANY(ARRAY_AGG(step_completed)) THEN 'educated'
        WHEN 'email_verified' = ANY(ARRAY_AGG(step_completed)) THEN 'verified'
        ELSE 'started'
    END as status
FROM public.offering_progress
GROUP BY user_id, offering_id;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.portal_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offering_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_exports ENABLE ROW LEVEL SECURITY;

-- Portal Accounts - Only active portal accounts can view
CREATE POLICY "Portal accounts can view their own record"
    ON public.portal_accounts
    FOR SELECT
    USING (id = auth.uid() OR is_active = true);

-- System Notices - Public read for published notices
CREATE POLICY "Anyone can view published system notices"
    ON public.system_notices
    FOR SELECT
    USING (is_published = true);

-- User Notifications - Users can only see their own
CREATE POLICY "Users can view their own notifications"
    ON public.user_notifications
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON public.user_notifications
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Compliance Audit Log - Portal accounts only
CREATE POLICY "Portal accounts can view audit logs"
    ON public.compliance_audit_log
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.portal_accounts
        WHERE id = auth.uid() AND is_active = true
    ));

-- Offering Progress - Users can see their own, portal can see all
CREATE POLICY "Users can view their own offering progress"
    ON public.offering_progress
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.portal_accounts
            WHERE id = auth.uid() AND is_active = true
        )
    );

-- Platform Communications - Users see their own
CREATE POLICY "Users can view their own communications"
    ON public.platform_communications
    FOR SELECT
    USING (user_id = auth.uid());

-- Compliance Exports - Portal accounts only
CREATE POLICY "Portal accounts can view exports"
    ON public.compliance_exports
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.portal_accounts
        WHERE id = auth.uid() AND is_active = true
    ));

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create a user notification from a system notice
CREATE OR REPLACE FUNCTION public.deliver_system_notice(
    p_notice_id UUID,
    p_user_id UUID
) RETURNS UUID AS $$
DECLARE
    v_notice RECORD;
    v_notification_id UUID;
BEGIN
    -- Get the system notice
    SELECT * INTO v_notice
    FROM public.system_notices
    WHERE id = p_notice_id AND is_published = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'System notice not found or not published';
    END IF;

    -- Create user notification
    INSERT INTO public.user_notifications (
        user_id,
        notice_id,
        notification_type,
        title,
        content,
        priority,
        metadata
    ) VALUES (
        p_user_id,
        p_notice_id,
        'system_notice',
        v_notice.title,
        v_notice.content,
        v_notice.priority,
        v_notice.metadata
    ) RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(
    p_notification_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.user_notifications
    SET read_at = NOW()
    WHERE id = p_notification_id
      AND user_id = auth.uid()
      AND read_at IS NULL;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log compliance action
CREATE OR REPLACE FUNCTION public.log_compliance_action(
    p_action_type TEXT,
    p_target_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_action_details JSONB DEFAULT '{}'::jsonb,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.compliance_audit_log (
        portal_account_id,
        action_type,
        target_type,
        target_id,
        action_details,
        success,
        error_message
    ) VALUES (
        auth.uid(),
        p_action_type,
        p_target_type,
        p_target_id,
        p_action_details,
        p_success,
        p_error_message
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.portal_accounts IS 'Compliance portal administrator accounts with role-based access control';
COMMENT ON TABLE public.system_notices IS 'Platform-wide announcements and regulatory notices for users';
COMMENT ON TABLE public.user_notifications IS 'Individual notifications delivered to users from system or events';
COMMENT ON TABLE public.compliance_audit_log IS 'Immutable audit trail of all compliance portal actions';
COMMENT ON TABLE public.offering_progress IS 'Tracks user participation progress through offering steps';
COMMENT ON TABLE public.platform_communications IS 'Log of all external communications sent to users';
COMMENT ON TABLE public.compliance_exports IS 'Record of all data exports for compliance and regulatory reporting';

-- ============================================================================
-- INITIAL SEED DATA
-- ============================================================================

-- Insert default portal account (update email as needed)
INSERT INTO public.portal_accounts (
    email,
    full_name,
    role,
    permissions,
    is_active
) VALUES (
    'compliance@ampel.ai',
    'Compliance Administrator',
    'admin',
    '["all"]'::jsonb,
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert example system notice
INSERT INTO public.system_notices (
    title,
    content,
    notice_type,
    priority,
    target_audience,
    is_published,
    requires_acknowledgment
) VALUES (
    'Welcome to Ampel',
    'Thank you for joining Ampel. Please complete your profile to unlock all features.',
    'announcement',
    'normal',
    'all',
    true,
    false
) ON CONFLICT DO NOTHING;