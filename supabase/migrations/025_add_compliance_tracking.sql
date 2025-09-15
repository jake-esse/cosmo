-- Migration: Add Regulation Crowdfunding Compliance Tracking
-- Purpose: Track user education, verification, and agreement status for Reg CF requirements
-- Note: This migration adds tracking without changing equity distribution logic

-- ============================================================================
-- PART 1: Add compliance tracking fields to profiles
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  -- Education tracking
  education_completed_at timestamptz,
  education_version text,
  
  -- KYC tracking (for Persona integration later)
  kyc_started_at timestamptz,
  kyc_completed_at timestamptz,
  kyc_provider text,
  kyc_provider_id text UNIQUE, -- Persona's ID to prevent duplicates
  kyc_verification_status text CHECK (kyc_verification_status IN ('pending', 'approved', 'declined', 'expired')),
  kyc_decline_reason text,
  
  -- Terms acceptance
  terms_accepted_at timestamptz,
  terms_version text,
  
  -- Offering-specific fields
  shares_claimed_at timestamptz, -- When they actually claimed (post-verification)
  offering_participant boolean DEFAULT false, -- Participating in current offering
  investor_type text CHECK (investor_type IN ('signup_bonus', 'referral', 'purchased')),
  
  -- Compliance flags
  is_blocked_jurisdiction boolean DEFAULT false, -- For state restrictions
  blocked_reason text;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status ON public.profiles(kyc_verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_education_completed ON public.profiles(education_completed_at);
CREATE INDEX IF NOT EXISTS idx_profiles_offering_participant ON public.profiles(offering_participant);

-- ============================================================================
-- PART 2: Discussion board for offering page Q&A
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.discussion_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Content
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  
  -- Metadata
  is_admin boolean DEFAULT false,
  is_visible boolean DEFAULT true,
  is_pinned boolean DEFAULT false,
  
  -- Moderation
  moderated_at timestamptz,
  moderated_by uuid REFERENCES public.profiles(id),
  moderation_reason text,
  
  -- Edit tracking
  edited_at timestamptz,
  edit_count integer DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  
  -- Prevent edits after 1 hour
  CONSTRAINT no_late_edits CHECK (
    edited_at IS NULL OR 
    edited_at <= created_at + interval '1 hour'
  )
);

-- Indexes for performance
CREATE INDEX idx_discussion_posts_visible ON public.discussion_posts(is_visible, created_at DESC);
CREATE INDEX idx_discussion_posts_user ON public.discussion_posts(user_id);
CREATE INDEX idx_discussion_posts_admin ON public.discussion_posts(is_admin) WHERE is_admin = true;

-- Enable RLS
ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;

-- Policies for discussion posts
-- Everyone can read visible posts
CREATE POLICY "Public can view visible posts" ON public.discussion_posts
  FOR SELECT USING (is_visible = true);

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts" ON public.discussion_posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_admin = false);

-- Users can edit their own posts within 1 hour
CREATE POLICY "Users can edit own posts within time limit" ON public.discussion_posts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND created_at > now() - interval '1 hour')
  WITH CHECK (auth.uid() = user_id);

-- Admins can moderate posts
CREATE POLICY "Admins can moderate posts" ON public.discussion_posts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================================
-- PART 3: User agreements tracking (immutable audit log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Agreement details
  agreement_type text NOT NULL CHECK (agreement_type IN (
    'terms_of_service',
    'privacy_policy', 
    'education_materials',
    'risk_acknowledgment',
    'resale_restrictions',
    'offering_terms'
  )),
  agreement_version text NOT NULL,
  agreement_hash text, -- SHA-256 of agreement text for integrity
  
  -- Acceptance
  accepted boolean DEFAULT true,
  acceptance_method text CHECK (acceptance_method IN ('checkbox', 'button_click', 'signature')),
  
  -- Metadata for compliance
  ip_address inet,
  user_agent text,
  session_id text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  
  -- Prevent duplicate agreements
  CONSTRAINT unique_user_agreement UNIQUE(user_id, agreement_type, agreement_version)
);

-- This table should be append-only for audit purposes
CREATE OR REPLACE FUNCTION prevent_agreement_updates()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'User agreements cannot be modified after creation';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_update_agreements
  BEFORE UPDATE OR DELETE ON public.user_agreements
  FOR EACH ROW EXECUTE FUNCTION prevent_agreement_updates();

-- Indexes
CREATE INDEX idx_user_agreements_user ON public.user_agreements(user_id);
CREATE INDEX idx_user_agreements_type ON public.user_agreements(agreement_type);
CREATE INDEX idx_user_agreements_created ON public.user_agreements(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_agreements ENABLE ROW LEVEL SECURITY;

-- Users can view their own agreements
CREATE POLICY "Users can view own agreements" ON public.user_agreements
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- System can insert agreements (via service role)
-- No direct insert policy for users - must go through API

-- ============================================================================
-- PART 4: Education completion tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.education_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Section tracking
  section_id text NOT NULL CHECK (section_id IN (
    'how_it_works',
    'understanding_risks',
    'resale_restrictions',
    'security_type',
    'company_overview',
    'risk_factors'
  )),
  
  -- Engagement metrics
  time_spent_seconds integer CHECK (time_spent_seconds >= 0),
  scroll_depth_percent integer CHECK (scroll_depth_percent BETWEEN 0 AND 100),
  
  -- Completion
  completed boolean DEFAULT false,
  completed_at timestamptz DEFAULT now(),
  
  -- Prevent duplicates
  CONSTRAINT unique_user_section UNIQUE(user_id, section_id)
);

-- Indexes
CREATE INDEX idx_education_completions_user ON public.education_completions(user_id);
CREATE INDEX idx_education_completions_completed ON public.education_completions(completed);

-- Enable RLS
ALTER TABLE public.education_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own completions
CREATE POLICY "Users can view own education progress" ON public.education_completions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can track own education progress" ON public.education_completions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own education progress" ON public.education_completions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PART 5: Helper functions for compliance checking
-- ============================================================================

-- Check if user has completed all requirements
CREATE OR REPLACE FUNCTION check_user_compliance(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_education_complete boolean;
  v_kyc_complete boolean;
  v_terms_accepted boolean;
  v_all_sections_complete boolean;
BEGIN
  -- Check education completion
  SELECT 
    CASE 
      WHEN education_completed_at IS NOT NULL THEN true
      ELSE false
    END,
    CASE 
      WHEN kyc_verification_status = 'approved' THEN true
      ELSE false
    END,
    CASE 
      WHEN terms_accepted_at IS NOT NULL THEN true
      ELSE false
    END
  INTO v_education_complete, v_kyc_complete, v_terms_accepted
  FROM profiles
  WHERE id = p_user_id;
  
  -- Check all education sections
  SELECT 
    COUNT(*) = 6 -- Total number of required sections
  INTO v_all_sections_complete
  FROM education_completions
  WHERE user_id = p_user_id AND completed = true;
  
  -- Build result
  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'education_complete', v_education_complete,
    'all_sections_complete', v_all_sections_complete,
    'kyc_complete', v_kyc_complete,
    'terms_accepted', v_terms_accepted,
    'can_receive_shares', v_education_complete AND v_kyc_complete AND v_terms_accepted,
    'checked_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- Record agreement acceptance
CREATE OR REPLACE FUNCTION record_agreement_acceptance(
  p_user_id uuid,
  p_agreement_type text,
  p_agreement_version text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agreement_id uuid;
BEGIN
  INSERT INTO user_agreements (
    user_id,
    agreement_type,
    agreement_version,
    accepted,
    acceptance_method,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_agreement_type,
    p_agreement_version,
    true,
    'checkbox',
    p_ip_address,
    p_user_agent
  )
  ON CONFLICT (user_id, agreement_type, agreement_version) 
  DO NOTHING
  RETURNING id INTO v_agreement_id;
  
  -- Update profile if this is terms acceptance
  IF p_agreement_type = 'offering_terms' AND v_agreement_id IS NOT NULL THEN
    UPDATE profiles 
    SET 
      terms_accepted_at = now(),
      terms_version = p_agreement_version
    WHERE id = p_user_id;
  END IF;
  
  RETURN v_agreement_id;
END;
$$;

-- Track education section completion
CREATE OR REPLACE FUNCTION track_education_completion(
  p_user_id uuid,
  p_section_id text,
  p_time_spent integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO education_completions (
    user_id,
    section_id,
    time_spent_seconds,
    completed
  ) VALUES (
    p_user_id,
    p_section_id,
    p_time_spent,
    true
  )
  ON CONFLICT (user_id, section_id)
  DO UPDATE SET
    time_spent_seconds = GREATEST(education_completions.time_spent_seconds, p_time_spent),
    completed = true,
    completed_at = now();
  
  -- Check if all sections complete and update profile
  IF (
    SELECT COUNT(*) = 6 
    FROM education_completions 
    WHERE user_id = p_user_id AND completed = true
  ) THEN
    UPDATE profiles
    SET 
      education_completed_at = now(),
      education_version = '1.0.0'
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- ============================================================================
-- PART 6: Sample data for demo (REMOVE FOR PRODUCTION)
-- ============================================================================

-- Insert sample discussion posts for demo
INSERT INTO public.discussion_posts (user_id, content, is_admin, created_at) 
VALUES 
  (
    (SELECT id FROM profiles WHERE is_admin = true LIMIT 1),
    'Welcome to our Regulation CF offering! I''m here to answer any questions about our equity incentive program.',
    true,
    now() - interval '2 days'
  ),
  (
    (SELECT id FROM profiles WHERE is_admin = false LIMIT 1),
    'How long before we can sell these shares?',
    false,
    now() - interval '1 day'
  ),
  (
    (SELECT id FROM profiles WHERE is_admin = true LIMIT 1),
    'Great question! Per SEC regulations, there''s a mandatory 1-year holding period before shares can be transferred. After that, we''re exploring liquidity options including secondary markets.',
    true,
    now() - interval '1 day' + interval '1 hour'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 7: Grant permissions for RPC functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION check_user_compliance TO authenticated;
GRANT EXECUTE ON FUNCTION record_agreement_acceptance TO authenticated;
GRANT EXECUTE ON FUNCTION track_education_completion TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- 
-- This migration adds:
-- 1. Compliance tracking fields to profiles table
-- 2. Discussion board with moderation features
-- 3. Immutable agreement tracking for audit trail
-- 4. Education completion tracking
-- 5. Helper functions for compliance checking
-- 6. Proper RLS policies for security
-- 7. Sample data for demo purposes
--
-- NOTE: This does NOT change equity distribution logic
-- That will be updated after KYC integration is complete
-- ============================================================================