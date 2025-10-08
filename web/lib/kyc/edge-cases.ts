/**
 * Critical edge case handlers for KYC MVP
 * Advanced cases deferred to post-launch
 */

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * 1. Session Expiration - CRITICAL
 * Check if a KYC session has expired (30 minutes from creation)
 */
export function isSessionExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

/**
 * 2. Duplicate QR Scan - CRITICAL
 * When user starts a new KYC session, invalidate all previous incomplete sessions
 * This prevents multiple QR codes being active at once
 */
export async function invalidateOldSessions(userId: string, currentSessionId: string) {
  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('kyc_sessions')
    .update({ status: 'expired' })
    .eq('user_id', userId)
    .neq('id', currentSessionId)
    .not('status', 'in', '(completed,failed)')

  if (error) {
    console.error('[KYC Edge Case] Error invalidating old sessions:', {
      userId,
      currentSessionId,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * 3. Check if user already has completed verification - CRITICAL
 * Prevents re-verification of already verified users
 */
export async function hasExistingVerification(userId: string): Promise<boolean> {
  const adminSupabase = createAdminClient()

  const { data, error } = await adminSupabase
    .from('persona_accounts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[KYC Edge Case] Error checking existing verification:', {
      userId,
      error: error.message,
      timestamp: new Date().toISOString()
    })
    return false
  }

  return !!data
}

/**
 * 4. Get latest active session for user - CRITICAL
 * Used to check if user has an in-progress session
 */
export async function getLatestActiveSession(userId: string) {
  const adminSupabase = createAdminClient()

  const { data, error } = await adminSupabase
    .from('kyc_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[KYC Edge Case] Error fetching latest session:', {
      userId,
      error: error.message,
      timestamp: new Date().toISOString()
    })
    return null
  }

  return data
}

/**
 * Deferred Edge Cases (Post-Launch)
 *
 * 3. Network failure during redirect
 *    - User can refresh page and continue
 *    - Acceptable for MVP
 *
 * 4. Persona API downtime
 *    - Show generic error message
 *    - Ask user to try again later
 *    - Will add status page monitoring post-launch
 *
 * 5. Multiple tabs open
 *    - May cause confusion with multiple QR codes
 *    - Not a security issue, just UX issue
 *    - Can add tab synchronization post-launch
 *
 * 6. Back button navigation
 *    - Browser handles it reasonably
 *    - May require refresh in some cases
 *    - Acceptable for MVP
 *
 * 7. Mobile app deep linking
 *    - Currently uses web flow only
 *    - Can add native app support post-launch
 */
