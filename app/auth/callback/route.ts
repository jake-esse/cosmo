import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // Only handle OAuth callbacks (not email verification)
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
    }
  }

  // Default redirect to login
  // This handles when Supabase redirects after email confirmation
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}