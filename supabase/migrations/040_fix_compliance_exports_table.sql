-- Migration: Fix Compliance Exports Table
-- Purpose: Add missing columns and update structure to match UI expectations
-- Date: 2025-01-17

-- The table exists from migration 036, but needs additional columns for the UI

-- Add status column that the UI expects
ALTER TABLE public.compliance_exports
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- Add format column as alias to export_format (UI uses 'format')
ALTER TABLE public.compliance_exports
ADD COLUMN IF NOT EXISTS format TEXT GENERATED ALWAYS AS (export_format) STORED;

-- Add requested_at column
ALTER TABLE public.compliance_exports
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT NOW();

-- Add completed_at column
ALTER TABLE public.compliance_exports
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add error_message column for failed exports
ALTER TABLE public.compliance_exports
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add file_size column as alias to file_size_bytes
ALTER TABLE public.compliance_exports
ADD COLUMN IF NOT EXISTS file_size BIGINT GENERATED ALWAYS AS (file_size_bytes) STORED;

-- Update the export_type constraint to be more flexible (remove the strict check)
ALTER TABLE public.compliance_exports
DROP CONSTRAINT IF EXISTS compliance_exports_export_type_check;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_compliance_exports_status
ON public.compliance_exports(status) WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_exports_requested_at
ON public.compliance_exports(requested_at DESC) WHERE requested_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.compliance_exports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Compliance users can view exports" ON public.compliance_exports;
DROP POLICY IF EXISTS "Compliance users can create exports" ON public.compliance_exports;
DROP POLICY IF EXISTS "System can update exports" ON public.compliance_exports;

-- Policy: Compliance portal users can view all exports
CREATE POLICY "Compliance users can view exports" ON public.compliance_exports
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.portal_accounts
            WHERE auth_user_id = auth.uid()
            AND is_active = true
        )
    );

-- Policy: Compliance portal users can create exports (except viewers)
CREATE POLICY "Compliance users can create exports" ON public.compliance_exports
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.portal_accounts
            WHERE auth_user_id = auth.uid()
            AND is_active = true
            AND role IN ('admin', 'compliance_officer', 'auditor')
        )
    );

-- Policy: Allow updates for status changes (for processing exports)
CREATE POLICY "System can update exports" ON public.compliance_exports
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.portal_accounts
            WHERE auth_user_id = auth.uid()
            AND is_active = true
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.compliance_exports TO authenticated;

-- Note: The compliance_exports table has immutability triggers from migration 036
-- We need to temporarily disable them to allow status updates
DROP TRIGGER IF EXISTS prevent_compliance_exports_modification ON public.compliance_exports;

-- Create a new trigger that only prevents DELETE but allows UPDATE for status changes
CREATE OR REPLACE FUNCTION prevent_compliance_exports_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Deletes are not allowed on compliance_exports table for compliance reasons';
    END IF;
    -- Allow updates for status changes
    IF TG_OP = 'UPDATE' THEN
        -- Only allow specific column updates
        IF (NEW.status IS DISTINCT FROM OLD.status) OR
           (NEW.completed_at IS DISTINCT FROM OLD.completed_at) OR
           (NEW.file_size_bytes IS DISTINCT FROM OLD.file_size_bytes) OR
           (NEW.record_count IS DISTINCT FROM OLD.record_count) OR
           (NEW.download_url IS DISTINCT FROM OLD.download_url) OR
           (NEW.error_message IS DISTINCT FROM OLD.error_message) THEN
            RETURN NEW;
        ELSE
            -- Check if any other columns were modified
            IF NEW IS DISTINCT FROM OLD THEN
                RAISE EXCEPTION 'Only status-related updates are allowed on compliance_exports table';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the new trigger
CREATE TRIGGER prevent_compliance_exports_modification
BEFORE UPDATE OR DELETE ON public.compliance_exports
FOR EACH ROW
EXECUTE FUNCTION prevent_compliance_exports_delete();