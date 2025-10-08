-- Migration: KYC Persona Integration
-- Description: Adds tables and functions for mobile-first KYC flow with Persona hosted verification

-- ============================================================================
-- ENUMS
-- ============================================================================

-- KYC session status enum
CREATE TYPE kyc_session_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'failed',
  'expired'
);

-- Device type enum
CREATE TYPE device_type AS ENUM (
  'desktop',
  'mobile',
  'unknown'
);

-- KYC verification status enum (matches Persona inquiry statuses)
CREATE TYPE kyc_verification_status AS ENUM (
  'created',
  'pending',
  'approved',
  'declined',
  'needs_review',
  'expired'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Table: persona_accounts
-- Purpose: Track Persona Account IDs to prevent duplicate accounts
-- Security: One Persona account can only link to one Ampel user
CREATE TABLE persona_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_account_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT persona_accounts_user_id_unique UNIQUE (user_id),
  CONSTRAINT persona_accounts_persona_account_id_unique UNIQUE (persona_account_id)
);

-- Table: kyc_sessions
-- Purpose: Manage verification flow state for desktop/mobile handoff
-- Security: Tracks QR code sessions and prevents replay attacks
CREATE TABLE kyc_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  inquiry_id TEXT,
  status kyc_session_status NOT NULL DEFAULT 'pending',
  device_type device_type NOT NULL DEFAULT 'unknown',
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  callback_status TEXT,

  -- Constraints
  CONSTRAINT kyc_sessions_session_token_unique UNIQUE (session_token)
);

-- Table: kyc_verifications
-- Purpose: Complete verification history with Persona inquiry and account IDs
-- Security: No PII storage, only references to Persona records
CREATE TABLE kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_inquiry_id TEXT NOT NULL,
  persona_account_id TEXT,
  status kyc_verification_status NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Constraints
  CONSTRAINT kyc_verifications_persona_inquiry_id_unique UNIQUE (persona_inquiry_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- persona_accounts indexes
CREATE INDEX idx_persona_accounts_user_id ON persona_accounts(user_id);
CREATE INDEX idx_persona_accounts_persona_account_id ON persona_accounts(persona_account_id);

-- kyc_sessions indexes
CREATE INDEX idx_kyc_sessions_user_id ON kyc_sessions(user_id);
CREATE INDEX idx_kyc_sessions_session_token ON kyc_sessions(session_token);
CREATE INDEX idx_kyc_sessions_status ON kyc_sessions(status);
CREATE INDEX idx_kyc_sessions_expires_at ON kyc_sessions(expires_at);
CREATE INDEX idx_kyc_sessions_inquiry_id ON kyc_sessions(inquiry_id);

-- kyc_verifications indexes
CREATE INDEX idx_kyc_verifications_user_id ON kyc_verifications(user_id);
CREATE INDEX idx_kyc_verifications_persona_inquiry_id ON kyc_verifications(persona_inquiry_id);
CREATE INDEX idx_kyc_verifications_persona_account_id ON kyc_verifications(persona_account_id);
CREATE INDEX idx_kyc_verifications_status ON kyc_verifications(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE persona_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;

-- persona_accounts policies
CREATE POLICY "Users can read their own persona accounts"
  ON persona_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert persona accounts"
  ON persona_accounts FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update persona accounts"
  ON persona_accounts FOR UPDATE
  USING (auth.role() = 'service_role');

-- kyc_sessions policies
CREATE POLICY "Users can read their own KYC sessions"
  ON kyc_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage KYC sessions"
  ON kyc_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- kyc_verifications policies
CREATE POLICY "Users can read their own KYC verifications"
  ON kyc_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage KYC verifications"
  ON kyc_verifications FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: check_duplicate_account
-- Purpose: Check if a Persona account ID already exists in the system
-- Returns: Boolean indicating if account exists
-- Security: SECURITY DEFINER to bypass RLS for duplicate checking
CREATE OR REPLACE FUNCTION check_duplicate_account(
  p_persona_account_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM persona_accounts
    WHERE persona_account_id = p_persona_account_id
  );
END;
$$;

-- Function: get_active_session
-- Purpose: Get the latest non-expired session for a user
-- Returns: Session record or NULL if no active session
-- Security: SECURITY DEFINER to ensure consistent access
CREATE OR REPLACE FUNCTION get_active_session(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  session_token TEXT,
  inquiry_id TEXT,
  status kyc_session_status,
  device_type device_type,
  initiated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ks.id,
    ks.session_token,
    ks.inquiry_id,
    ks.status,
    ks.device_type,
    ks.initiated_at,
    ks.expires_at
  FROM kyc_sessions ks
  WHERE ks.user_id = p_user_id
    AND ks.expires_at > NOW()
    AND ks.status NOT IN ('completed', 'failed', 'expired')
  ORDER BY ks.initiated_at DESC
  LIMIT 1;
END;
$$;

-- Function: cleanup_expired_sessions
-- Purpose: Mark sessions as expired when they pass their expiration time
-- Returns: Number of sessions marked as expired
-- Security: SECURITY DEFINER to allow system-level cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE kyc_sessions
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE expires_at <= NOW()
    AND status NOT IN ('completed', 'failed', 'expired');

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function: auto_expire_kyc_session
-- Purpose: Automatically expire sessions that have passed their expiration time
-- Trigger: Before SELECT on kyc_sessions
CREATE OR REPLACE FUNCTION auto_expire_kyc_session()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.expires_at <= NOW() AND NEW.status NOT IN ('completed', 'failed', 'expired') THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: Update status to expired on read if past expiration
CREATE TRIGGER trigger_auto_expire_kyc_session
  BEFORE UPDATE ON kyc_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_expire_kyc_session();

-- Function: update_updated_at_column
-- Purpose: Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers: Auto-update updated_at columns
CREATE TRIGGER trigger_persona_accounts_updated_at
  BEFORE UPDATE ON persona_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_kyc_verifications_updated_at
  BEFORE UPDATE ON kyc_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE persona_accounts IS 'Links Ampel users to Persona account IDs for duplicate prevention';
COMMENT ON TABLE kyc_sessions IS 'Manages KYC verification sessions including QR code handoff between devices';
COMMENT ON TABLE kyc_verifications IS 'Complete history of KYC verification attempts and results';

COMMENT ON FUNCTION check_duplicate_account IS 'Check if a Persona account ID already exists to prevent duplicates';
COMMENT ON FUNCTION get_active_session IS 'Get the most recent non-expired session for a user';
COMMENT ON FUNCTION cleanup_expired_sessions IS 'Mark expired sessions and return count of affected rows';
