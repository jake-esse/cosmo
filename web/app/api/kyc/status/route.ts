import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { KYCStatusResponse } from '@shared/types/persona'

/**
 * GET /api/kyc/status
 *
 * Returns current KYC verification status for authenticated user
 * Used by desktop UI to poll for mobile verification completion
 * Query params: session_token (optional, for specific session)
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const sessionToken = searchParams.get('session_token')

    const adminSupabase = createAdminClient()

    // Get the most recent active session for the user
    let session

    if (sessionToken) {
      // Look up specific session by token
      const { data, error } = await adminSupabase
        .from('kyc_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('[KYC Status] Error fetching KYC session:', {
          sessionToken,
          userId: user.id,
          error: error.message,
          timestamp: new Date().toISOString(),
        })
        return NextResponse.json(
          {
            success: false,
            error: 'Error fetching session',
          } as KYCStatusResponse,
          { status: 500 }
        )
      }

      session = data
    } else {
      // Get most recent session using database function
      const { data, error } = await adminSupabase
        .rpc('get_active_session', { p_user_id: user.id })

      if (error) {
        console.error('[KYC Status] Error calling get_active_session:', {
          userId: user.id,
          error: error.message,
          timestamp: new Date().toISOString(),
        })
        return NextResponse.json(
          {
            success: false,
            error: 'Error fetching session',
          } as KYCStatusResponse,
          { status: 500 }
        )
      }

      // RPC returns an array, take first result
      session = Array.isArray(data) && data.length > 0 ? data[0] : null
    }

    if (!session) {
      return NextResponse.json({
        success: true,
        status: 'pending',
        completed: false,
      } as KYCStatusResponse)
    }

    // Check if session has expired
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    if (now > expiresAt && session.status !== 'completed' && session.status !== 'failed') {
      // Update session to expired
      await adminSupabase
        .from('kyc_sessions')
        .update({ status: 'expired' })
        .eq('id', session.id)

      return NextResponse.json({
        success: true,
        status: 'expired',
        completed: false,
      } as KYCStatusResponse)
    }

    // Return session status
    const completed = session.status === 'completed' || session.status === 'failed'

    return NextResponse.json({
      success: true,
      status: session.status,
      completed,
      inquiryId: session.inquiry_id || undefined,
    } as KYCStatusResponse)
  } catch (error) {
    console.error('[KYC Status] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      } as KYCStatusResponse,
      { status: 500 }
    )
  }
}
