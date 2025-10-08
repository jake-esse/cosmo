-- Migration: Add education tracking for regulatory compliance
-- Description: Adds education acknowledgments table and updates profiles for tracking education completion

-- Drop existing table if it exists (to handle partial migrations)
DROP TABLE IF EXISTS education_acknowledgments CASCADE;

-- Create education_acknowledgments table for tracking user acknowledgments
CREATE TABLE education_acknowledgments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  acknowledged_at TIMESTAMPTZ DEFAULT now(),
  version TEXT DEFAULT '1.0' NOT NULL,
  all_sections_read BOOLEAN DEFAULT false NOT NULL,
  sections_read JSONB DEFAULT '[]'::jsonb NOT NULL,
  time_spent_seconds INTEGER DEFAULT 0 CHECK (time_spent_seconds >= 0),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add RLS policies for education_acknowledgments
ALTER TABLE education_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Users can only read their own acknowledgments
CREATE POLICY "Users can view own education acknowledgments"
ON education_acknowledgments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own acknowledgments (only if none exists)
CREATE POLICY "Users can insert own education acknowledgments"
ON education_acknowledgments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (
    SELECT 1 FROM education_acknowledgments WHERE user_id = auth.uid()
  )
);

-- Users can update their own acknowledgments
CREATE POLICY "Users can update own education acknowledgments"
ON education_acknowledgments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Add education_completed_at to profiles if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS education_completed_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_education_acknowledgments_user_id
ON education_acknowledgments(user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_education_completed_at
ON profiles(education_completed_at)
WHERE education_completed_at IS NOT NULL;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS complete_education_acknowledgment(UUID, JSONB, INTEGER);

-- Create function to complete education acknowledgment
CREATE OR REPLACE FUNCTION complete_education_acknowledgment(
  p_user_id UUID,
  p_sections_read JSONB,
  p_time_spent INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_acknowledgment_id UUID;
BEGIN
  -- Insert or update education acknowledgment
  INSERT INTO education_acknowledgments (
    user_id,
    acknowledged_at,
    version,
    all_sections_read,
    sections_read,
    time_spent_seconds,
    created_at
  ) VALUES (
    p_user_id,
    now(),
    '1.0',
    true,
    p_sections_read,
    p_time_spent,
    now()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    acknowledged_at = now(),
    all_sections_read = true,
    sections_read = p_sections_read,
    time_spent_seconds = education_acknowledgments.time_spent_seconds + EXCLUDED.time_spent_seconds
  RETURNING id INTO v_acknowledgment_id;

  -- Update profile to mark education as completed
  UPDATE profiles
  SET
    education_completed_at = now(),
    education_version = '1.0',
    updated_at = now()
  WHERE id = p_user_id
  AND education_completed_at IS NULL;

  -- Return success response
  v_result := jsonb_build_object(
    'success', true,
    'acknowledgment_id', v_acknowledgment_id,
    'education_completed', true
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION complete_education_acknowledgment TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE education_acknowledgments IS 'Tracks user acknowledgments of educational materials for regulatory compliance';
COMMENT ON COLUMN education_acknowledgments.sections_read IS 'JSON array of section IDs that have been read';
COMMENT ON COLUMN education_acknowledgments.time_spent_seconds IS 'Total time spent reading educational materials';
COMMENT ON COLUMN profiles.education_completed_at IS 'Timestamp when user completed educational requirements';