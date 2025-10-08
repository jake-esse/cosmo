-- Migration: Add KYC Flow Context Tracking
-- Description: Adds initiated_from field to differentiate mobile-direct vs desktop-QR flows

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Flow initiation context enum
CREATE TYPE kyc_flow_context AS ENUM (
  'mobile_direct',    -- User started KYC directly on mobile device
  'desktop_qr'        -- User scanned QR code from desktop on their mobile
);

-- ============================================================================
-- SCHEMA CHANGES
-- ============================================================================

-- Add initiated_from column to kyc_sessions
ALTER TABLE kyc_sessions
ADD COLUMN initiated_from kyc_flow_context;

-- Backfill existing sessions based on device_type
-- Desktop sessions are desktop_qr (they generate QR codes)
-- Mobile sessions are mobile_direct (they redirect immediately)
UPDATE kyc_sessions
SET initiated_from = CASE
  WHEN device_type = 'desktop' THEN 'desktop_qr'::kyc_flow_context
  WHEN device_type = 'mobile' THEN 'mobile_direct'::kyc_flow_context
  ELSE NULL
END
WHERE initiated_from IS NULL;

-- Make the column NOT NULL after backfill
ALTER TABLE kyc_sessions
ALTER COLUMN initiated_from SET NOT NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Add index for flow context queries
CREATE INDEX idx_kyc_sessions_initiated_from ON kyc_sessions(initiated_from);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN kyc_sessions.initiated_from IS 'Tracks whether verification was initiated directly on mobile or via QR code from desktop';
COMMENT ON TYPE kyc_flow_context IS 'Enum for KYC flow initiation context: mobile_direct or desktop_qr';
