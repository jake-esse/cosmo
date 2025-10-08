-- Migration: Update handle_new_user to capture auth_provider
-- Purpose: Automatically set auth_provider when new users sign up
-- Date: 2025-10-07
-- Depends on: 059_add_auth_provider_to_profiles.sql

-- Update handle_new_user function to extract and set auth_provider
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_provider TEXT;
BEGIN
  -- Extract auth provider from Supabase auth metadata
  -- OAuth providers (google, apple, facebook) have provider in app_metadata
  -- Email/password users default to 'email'
  v_auth_provider := COALESCE(
    NEW.raw_app_metadata->>'provider',
    NEW.app_metadata->>'provider',
    'email'
  );

  -- Normalize provider name to lowercase
  v_auth_provider := lower(v_auth_provider);

  -- Ensure valid provider value (must match CHECK constraint)
  -- Valid values: 'email', 'google', 'apple', 'facebook'
  IF v_auth_provider NOT IN ('email', 'google', 'apple', 'facebook') THEN
    v_auth_provider := 'email';
  END IF;

  -- Create profile for new user with auth_provider
  -- offering_participant is NULL until user explicitly opts in
  INSERT INTO public.profiles (
    id,
    referral_code,
    auth_provider,
    offering_participant,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    substr(md5(random()::text), 1, 8),
    v_auth_provider,
    NULL, -- NULL means undecided, no shares awarded yet
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Add comment documenting the auth_provider extraction logic
COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function that creates user profile on signup. Automatically extracts auth provider from Supabase metadata (google, apple, facebook, or email).';
