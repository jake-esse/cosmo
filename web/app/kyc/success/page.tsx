/**
 * KYC Success Page
 * Displayed after successful identity verification
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import KYCSuccessContent from './KYCSuccessContent'

export default async function KYCSuccessPage() {
  // Verify user session
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    // No valid session - redirect to login
    redirect('/login?redirect=/kyc/start&error=session_lost')
  }

  // Verify KYC was actually completed by checking for completed session
  // This is more reliable than checking persona_accounts because:
  // 1. Session status is always updated before redirect
  // 2. No dependency on Persona accountId being present
  // 3. No race condition
  const adminSupabase = createAdminClient()
  const { data: completedSession } = await adminSupabase
    .from('kyc_sessions')
    .select('id, status, completed_at, inquiry_id')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false, nullsLast: true })
    .limit(1)
    .maybeSingle()

  if (!completedSession) {
    console.warn('[KYC Success] No completed session found:', {
      userId: user.id,
      timestamp: new Date().toISOString(),
    })
    // KYC not actually completed - redirect back to start
    redirect('/kyc/start?error=verification_incomplete')
  }

  // Also check for persona_accounts record (for reference/logging)
  const { data: personaAccount } = await adminSupabase
    .from('persona_accounts')
    .select('id, persona_account_id')
    .eq('user_id', user.id)
    .maybeSingle()

  console.log('[KYC Success] Verification check passed:', {
    userId: user.id,
    sessionId: completedSession.id,
    completedAt: completedSession.completed_at,
    inquiryId: completedSession.inquiry_id,
    personaAccountExists: !!personaAccount,
    personaAccountId: personaAccount?.persona_account_id,
    timestamp: new Date().toISOString(),
  })

  // All checks passed - show success page (client component handles redirect)
  return <KYCSuccessContent />
}
