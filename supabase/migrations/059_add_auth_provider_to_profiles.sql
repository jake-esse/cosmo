-- Migration: Add auth_provider column to profiles table
-- Purpose: Track authentication method used (email, google, apple, facebook)
-- Date: 2025-10-07

-- Add auth_provider column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS auth_provider TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.auth_provider IS 'Authentication provider used for signup: email, google, apple, or facebook';

-- Add check constraint to ensure valid values
ALTER TABLE profiles
ADD CONSTRAINT auth_provider_valid_values
CHECK (auth_provider IS NULL OR auth_provider IN ('email', 'google', 'apple', 'facebook'));

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider
ON profiles(auth_provider)
WHERE auth_provider IS NOT NULL;

-- Backfill existing users with 'email' as default
-- This assumes all existing users signed up via email/password
UPDATE profiles
SET auth_provider = 'email'
WHERE auth_provider IS NULL;

-- Add comment documenting the backfill
COMMENT ON TABLE profiles IS 'User profiles with authentication method tracking. Existing users backfilled with email provider.';
