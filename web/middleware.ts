import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { config as appConfig } from '@ampel/shared/config'

/**
 * Comprehensive middleware with step-by-step onboarding flow enforcement
 *
 * Flow Priority:
 * 1. Not authenticated → /login
 * 2. OAuth user → Skip email verification
 * 3. Email user without verified email → /check-email
 * 4. No KYC completion → /kyc/start
 * 5. No education completion → /onboarding
 * 6. All complete → Allow access to protected routes
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    appConfig.supabase.url,
    appConfig.supabase.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Route categorization
  const isApiRoute = pathname.startsWith('/api')
  const isPublicRoute = ['/', '/about', '/pricing'].includes(pathname)
  const isAuthRoute = [
    '/login',
    '/signup',
    '/reset-password',
    '/check-email',
    '/verification',
  ].some(route => pathname.startsWith(route))
  const isKycRoute = pathname.startsWith('/kyc')
  const isOnboardingRoute = pathname.startsWith('/onboarding')
  const isProtectedRoute = ['/dashboard', '/chat', '/settings'].some(
    route => pathname.startsWith(route)
  )

  // Skip checks for API routes and public routes
  if (isApiRoute || isPublicRoute) {
    return supabaseResponse
  }

  // Redirect unauthenticated users trying to access protected routes
  if (!user) {
    if (isProtectedRoute || isKycRoute || isOnboardingRoute) {
      console.log('[MIDDLEWARE] Unauthenticated access attempt:', {
        pathname,
        action: 'redirect_to_login',
        timestamp: new Date().toISOString(),
      })
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    // Allow access to auth routes and other public pages
    return supabaseResponse
  }

  // User is authenticated - check completion status
  try {
    // Fetch user profile with all required fields
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('auth_provider, email_verified_at, education_completed_at')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      console.error('[MIDDLEWARE] Profile fetch error:', {
        userId: user.id,
        error: profileError?.message,
        timestamp: new Date().toISOString(),
      })
      // If profile doesn't exist, redirect to login (invalid session)
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Check KYC completion
    const { data: kycAccount } = await supabase
      .from('persona_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    // Determine auth method and completion status
    const isOAuthUser = profile.auth_provider &&
      ['google', 'apple', 'facebook'].includes(profile.auth_provider)
    const emailVerified = isOAuthUser || !!profile.email_verified_at
    const kycComplete = !!kycAccount
    const educationComplete = !!profile.education_completed_at

    console.log('[MIDDLEWARE] User status check:', {
      pathname,
      userId: user.id,
      authProvider: profile.auth_provider,
      isOAuth: isOAuthUser,
      emailVerified,
      kycComplete,
      educationComplete,
      timestamp: new Date().toISOString(),
    })

    // Determine next incomplete step
    let nextStep: string | null = null
    if (!emailVerified) {
      nextStep = '/check-email'
    } else if (!kycComplete) {
      nextStep = '/kyc/start'
    } else if (!educationComplete) {
      nextStep = '/onboarding'
    }

    // If on auth route, redirect to next step or chat if complete
    if (isAuthRoute) {
      const redirectPath = nextStep || '/chat'
      console.log('[MIDDLEWARE] Auth route redirect:', {
        userId: user.id,
        from: pathname,
        to: redirectPath,
        reason: nextStep ? 'incomplete_step' : 'all_complete',
        timestamp: new Date().toISOString(),
      })
      const url = request.nextUrl.clone()
      url.pathname = redirectPath
      return NextResponse.redirect(url)
    }

    // Allow access if user is on check-email page and waiting for verification
    if (pathname.startsWith('/check-email') && !emailVerified) {
      console.log('[MIDDLEWARE] Allow access to check-email:', {
        userId: user.id,
        emailVerified: false,
        timestamp: new Date().toISOString(),
      })
      return supabaseResponse
    }

    // Allow access if user is on KYC routes and KYC is incomplete (or complete)
    // This allows both starting KYC and viewing KYC success pages
    if (isKycRoute && emailVerified) {
      console.log('[MIDDLEWARE] Allow access to KYC route:', {
        userId: user.id,
        pathname,
        kycComplete,
        timestamp: new Date().toISOString(),
      })
      return supabaseResponse
    }

    // Allow access if user is on onboarding and previous steps complete
    if (isOnboardingRoute && emailVerified && kycComplete) {
      console.log('[MIDDLEWARE] Allow access to onboarding:', {
        userId: user.id,
        educationComplete,
        timestamp: new Date().toISOString(),
      })
      return supabaseResponse
    }

    // Allow access to protected routes if all steps complete
    if (isProtectedRoute && !nextStep) {
      console.log('[MIDDLEWARE] Allow access to protected route:', {
        userId: user.id,
        pathname,
        allStepsComplete: true,
        timestamp: new Date().toISOString(),
      })
      return supabaseResponse
    }

    // If user has incomplete steps and trying to access protected routes, redirect
    if (nextStep && (isProtectedRoute || isKycRoute || isOnboardingRoute)) {
      // Don't redirect if already on the required step
      if (pathname.startsWith(nextStep)) {
        return supabaseResponse
      }

      console.log('[MIDDLEWARE] Redirect to next incomplete step:', {
        userId: user.id,
        from: pathname,
        to: nextStep,
        emailVerified,
        kycComplete,
        educationComplete,
        timestamp: new Date().toISOString(),
      })
      const url = request.nextUrl.clone()
      url.pathname = nextStep
      return NextResponse.redirect(url)
    }

    // Default: allow access
    return supabaseResponse
  } catch (error) {
    console.error('[MIDDLEWARE] Unexpected error:', {
      userId: user.id,
      pathname,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
    // On error, allow access to prevent blocking users
    return supabaseResponse
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}