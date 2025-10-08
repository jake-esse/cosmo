-- Fix education acknowledgment function to handle missing profiles
-- This ensures the profile exists before creating education acknowledgments

CREATE OR REPLACE FUNCTION complete_education_acknowledgment(
  p_user_id UUID,
  p_sections_read JSONB,
  p_time_spent INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_acknowledgment_id UUID;
  v_profile_exists BOOLEAN;
BEGIN
  -- Check if profile exists for this user
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;

  -- If profile doesn't exist, create it first
  IF NOT v_profile_exists THEN
    INSERT INTO profiles (
      id,
      referral_code,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      substr(md5(random()::text), 1, 8),
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

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
    onboarding_step = 'complete',
    onboarding_completed = true,
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

-- Also ensure profile creation trigger exists for new auth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    referral_code,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    substr(md5(random()::text), 1, 8),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Ensure trigger is set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();