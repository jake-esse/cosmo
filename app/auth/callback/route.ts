import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if this is a fresh email verification (within last 5 minutes)
      const emailConfirmedAt = data.user.email_confirmed_at
        ? new Date(data.user.email_confirmed_at)
        : null
      const now = new Date()
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

      const isRecentEmailVerification = emailConfirmedAt && emailConfirmedAt > fiveMinutesAgo

      if (isRecentEmailVerification) {
        // This is an email verification callback
        console.log('[AUTH_CALLBACK] Email verification detected')

        // Try to complete any pending referrals (but don't award shares yet)
        try {
          const { data: result, error } = await supabase.rpc(
            'complete_pending_referral_for_user',
            { p_user_id: data.user.id }
          )

          if (result?.success) {
            console.log('[AUTH_CALLBACK] Referral tracked:', result)
          } else if (result?.reason) {
            console.log('[AUTH_CALLBACK] Referral status:', result.reason)
          }

          if (error) {
            console.warn('[AUTH_CALLBACK] Error tracking referral:', error.message)
          }
        } catch (err) {
          console.error('[AUTH_CALLBACK] Exception during referral tracking:', err)
        }

        // Redirect to verification success page
        return NextResponse.redirect(new URL('/verification', requestUrl.origin))
      }

      // Not a fresh email verification - this is a regular callback (e.g., password reset)
      // Check user status and route appropriately
      const adminSupabase = createAdminClient()

      // Check if user has completed KYC
      const { data: kycAccount } = await adminSupabase
        .from('persona_accounts')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle()

      // If no KYC account, redirect to KYC start
      if (!kycAccount) {
        console.log('[AUTH_CALLBACK] No KYC found, redirecting to /kyc/start')
        return NextResponse.redirect(new URL('/kyc/start', requestUrl.origin))
      }

      // Check if user has completed education/onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('education_completed_at')
        .eq('id', data.user.id)
        .single()

      // Redirect based on onboarding status
      if (!profile?.education_completed_at) {
        console.log('[AUTH_CALLBACK] Education incomplete, redirecting to /onboarding')
        return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
      }

      // Everything complete, go to chat
      console.log('[AUTH_CALLBACK] User fully onboarded, redirecting to /chat')
      return NextResponse.redirect(new URL('/chat', requestUrl.origin))
    }
  }

  // Default redirect to login if something went wrong
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
