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
      console.log('[AUTH_CALLBACK] Session established for user:', data.user.id)

      const adminSupabase = createAdminClient()
      const now = new Date()
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // Get user profile to check email_verified_at and user creation time
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('email_verified_at, created_at, education_completed_at')
        .eq('id', data.user.id)
        .single()

      const userCreatedAt = profile?.created_at ? new Date(profile.created_at) : null
      const emailVerifiedAt = profile?.email_verified_at ? new Date(profile.email_verified_at) : null

      // Determine if this is first-time email verification
      const isFirstTimeVerification =
        userCreatedAt &&
        userCreatedAt > twentyFourHoursAgo &&
        !emailVerifiedAt

      console.log('[AUTH_CALLBACK] User verification status:', {
        userId: data.user.id,
        createdAt: userCreatedAt?.toISOString(),
        emailVerifiedAt: emailVerifiedAt?.toISOString(),
        isFirstTime: isFirstTimeVerification
      })

      // Update email_verified_at timestamp if not already set
      if (!emailVerifiedAt) {
        console.log('[AUTH_CALLBACK] Updating email_verified_at timestamp')
        await adminSupabase
          .from('profiles')
          .update({ email_verified_at: now.toISOString() })
          .eq('id', data.user.id)
      }

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

      // Route based on first-time vs subsequent verification
      if (isFirstTimeVerification) {
        // First-time verification - route based on user status
        console.log('[AUTH_CALLBACK] First-time verification - checking user completion status')

        // Check if user has completed KYC
        const { data: kycAccount } = await adminSupabase
          .from('persona_accounts')
          .select('id')
          .eq('user_id', data.user.id)
          .maybeSingle()

        // If no KYC account, redirect to KYC start
        if (!kycAccount) {
          console.log('[AUTH_CALLBACK] No KYC found → Redirecting to /kyc/start')
          return NextResponse.redirect(new URL('/kyc/start', requestUrl.origin))
        }

        // Check if user has completed education/onboarding
        if (!profile?.education_completed_at) {
          console.log('[AUTH_CALLBACK] KYC complete but education incomplete → Redirecting to /onboarding')
          return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
        }

        // Everything complete, go to chat
        console.log('[AUTH_CALLBACK] User fully onboarded → Redirecting to /chat')
        return NextResponse.redirect(new URL('/chat', requestUrl.origin))
      } else {
        // Subsequent verification (password reset, re-verification, etc.)
        console.log('[AUTH_CALLBACK] Subsequent verification → Redirecting to /verification success page')
        return NextResponse.redirect(new URL('/verification', requestUrl.origin))
      }
    }

    // Code exchange failed
    console.error('[AUTH_CALLBACK] Code exchange failed:', error?.message)
  }

  // Default redirect to login if something went wrong
  console.log('[AUTH_CALLBACK] No code or session establishment failed → Redirecting to /login')
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
