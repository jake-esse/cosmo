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

  // Verify KYC was actually completed
  const adminSupabase = createAdminClient()
  const { data: verifiedAccount } = await adminSupabase
    .from('persona_accounts')
    .select('id, persona_account_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!verifiedAccount) {
    // KYC not actually completed - redirect back to start
    redirect('/kyc/start?error=verification_incomplete')
  }

  // All checks passed - show success page (client component handles redirect)
  return <KYCSuccessContent />
}
