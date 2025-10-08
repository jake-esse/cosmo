import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')

  const supabase = await createClient()
  let userId: string | undefined
  let authProvider: string = 'email' // Default to email
  let isOAuthUser: boolean = false

  // Handle PKCE flow (OAuth, magic links with code)
  if (code) {
    console.log('[AUTH_CALLBACK] Processing PKCE flow with code')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      userId = data.user.id

      // Detect auth provider from user metadata
      const provider = data.user.app_metadata?.provider || 'email'
      authProvider = provider
      isOAuthUser = provider !== 'email'

      console.log('[AUTH_CALLBACK] PKCE session established for user:', userId)
      console.log('[AUTH_CALLBACK] Auth method detected:', provider, isOAuthUser ? '(OAuth)' : '(Email/Password)')
    } else {
      console.error('[AUTH_CALLBACK] Code exchange failed:', error?.message)
    }
  }
  // Handle email verification flow (signup verification links with token_hash)
  else if (token_hash && type) {
    console.log('[AUTH_CALLBACK] Processing email verification flow with token_hash')
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any
    })

    if (!error && data.user) {
      userId = data.user.id
      authProvider = 'email'
      isOAuthUser = false
      console.log('[AUTH_CALLBACK] Email verification session established for user:', userId)
      console.log('[AUTH_CALLBACK] Auth method: email (Email/Password)')
    } else {
      console.error('[AUTH_CALLBACK] Email verification failed:', error?.message)
    }
  }

  // If we have a userId from either flow, proceed with routing logic
  if (userId) {
    const adminSupabase = createAdminClient()
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get user profile to check email_verified_at and user creation time
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('email_verified_at, created_at, education_completed_at, auth_provider')
      .eq('id', userId)
      .single()

    // Store auth provider if not already set
    if (profile && !profile.auth_provider) {
      try {
        console.log('[AUTH_CALLBACK] Storing auth_provider:', authProvider)
        await adminSupabase
          .from('profiles')
          .update({ auth_provider: authProvider })
          .eq('id', userId)
      } catch (error) {
        console.warn('[AUTH_CALLBACK] Failed to store auth_provider:', error)
        // Continue anyway - this is not critical
      }
    } else if (profile?.auth_provider) {
      console.log('[AUTH_CALLBACK] Auth provider already set:', profile.auth_provider)
    }

    const userCreatedAt = profile?.created_at ? new Date(profile.created_at) : null
    const emailVerifiedAt = profile?.email_verified_at ? new Date(profile.email_verified_at) : null

    // Determine if this is first-time email verification
    const isFirstTimeVerification =
      userCreatedAt &&
      userCreatedAt > twentyFourHoursAgo &&
      !emailVerifiedAt

    console.log('[AUTH_CALLBACK] User verification status:', {
      userId,
      authProvider,
      isOAuth: isOAuthUser,
      createdAt: userCreatedAt?.toISOString(),
      emailVerifiedAt: emailVerifiedAt?.toISOString(),
      isFirstTime: isFirstTimeVerification
    })

    // Update email_verified_at timestamp if not already set
    if (!emailVerifiedAt) {
      if (isOAuthUser) {
        console.log('[AUTH_CALLBACK] OAuth user - email pre-verified by provider, setting email_verified_at')
      } else {
        console.log('[AUTH_CALLBACK] Email user - verification completed, setting email_verified_at')
      }

      await adminSupabase
        .from('profiles')
        .update({ email_verified_at: now.toISOString() })
        .eq('id', userId)
    } else {
      console.log('[AUTH_CALLBACK] Email already verified at:', emailVerifiedAt.toISOString())
    }

    // Try to complete any pending referrals (but don't award shares yet)
    try {
      const { data: result, error } = await supabase.rpc(
        'complete_pending_referral_for_user',
        { p_user_id: userId }
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
        .eq('user_id', userId)
        .maybeSingle()

      const kycComplete = !!kycAccount
      const educationComplete = !!profile?.education_completed_at

      console.log('[AUTH_CALLBACK] Completion status:', {
        kycComplete,
        educationComplete
      })

      // If no KYC account, redirect to KYC start
      if (!kycComplete) {
        console.log('[AUTH_CALLBACK] Routing decision: /kyc/start (reason: KYC not started)')
        return NextResponse.redirect(new URL('/kyc/start', requestUrl.origin))
      }

      // Check if user has completed education/onboarding
      if (!educationComplete) {
        console.log('[AUTH_CALLBACK] Routing decision: /onboarding (reason: education incomplete, KYC complete)')
        return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
      }

      // Everything complete, go to chat
      console.log('[AUTH_CALLBACK] Routing decision: /chat (reason: all requirements complete)')
      return NextResponse.redirect(new URL('/chat', requestUrl.origin))
    } else {
      // Subsequent verification (password reset, re-verification, etc.)
      console.log('[AUTH_CALLBACK] Routing decision: /verification (reason: subsequent verification, not first-time)')
      return NextResponse.redirect(new URL('/verification', requestUrl.origin))
    }
  }

  // Default redirect to login if something went wrong
  console.log('[AUTH_CALLBACK] No valid auth parameters or session establishment failed → Redirecting to /login')
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
