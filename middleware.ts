import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const isAuthPage = request.nextUrl.pathname.startsWith('/(auth)')
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
  const isOnboarding = request.nextUrl.pathname.startsWith('/onboarding')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')
  const isPublicRoute = request.nextUrl.pathname === '/' || 
                        request.nextUrl.pathname === '/about' || 
                        request.nextUrl.pathname === '/pricing'

  if (!user && isDashboard) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (!user && isOnboarding) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/chat'
    return NextResponse.redirect(url)
  }

  // Check onboarding status for authenticated users
  // TEMPORARILY DISABLED FOR TESTING - uncomment when ready to enforce onboarding
  // if (user && !isOnboarding && !isApiRoute && !isAuthPage && !isPublicRoute) {
  //   const { data: status } = await supabase
  //     .rpc('get_onboarding_status', { p_user_id: user.id })
    
  //   if (status?.next_action === 'complete_education') {
  //     const url = request.nextUrl.clone()
  //     url.pathname = '/onboarding/education'
  //     return NextResponse.redirect(url)
  //   }
  // }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}