import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Check if this is an email verification (user just confirmed their email)
      if (data.user.email_confirmed_at && data.user.id) {
        try {
          // Use the fixed referral completion function
          const { data: result, error } = await supabase.rpc(
            'complete_pending_referral_for_user',
            { p_user_id: data.user.id }
          )
          
          if (result?.success) {
            console.log('[AUTH_CALLBACK] Successfully completed referral:', result)
          } else if (result?.reason) {
            console.log('[AUTH_CALLBACK] Referral completion result:', result.reason)
          }
          
          if (error) {
            console.warn('[AUTH_CALLBACK] Error completing referral:', error.message)
          }
        } catch (err) {
          console.error('[AUTH_CALLBACK] Exception during referral completion:', err)
          // Don't fail auth flow
        }
      }

      // Check if user has completed education
      const { data: profile } = await supabase
        .from('profiles')
        .select('education_completed_at')
        .eq('id', data.user.id)
        .single()

      // Redirect to onboarding if education not completed, otherwise to chat
      if (!profile?.education_completed_at) {
        return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
      } else {
        return NextResponse.redirect(new URL('/chat', requestUrl.origin))
      }
    }
  }

  // Default redirect to login
  // This handles when Supabase redirects after email confirmation
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}