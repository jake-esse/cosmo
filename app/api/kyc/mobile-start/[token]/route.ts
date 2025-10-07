import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { personaApi } from '@/lib/persona/client'

/**
 * GET /api/kyc/mobile-start/[token]
 *
 * Handles mobile QR code scan or email link click
 * - Validates session token and checks expiration
 * - Creates Persona inquiry for the user
 * - Generates one-time link and redirects to Persona hosted flow
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const adminSupabase = createAdminClient()

    // Look up session by token
    const { data: session, error: sessionError } = await adminSupabase
      .from('kyc_sessions')
      .select('*')
      .eq('session_token', token)
      .maybeSingle()

    if (sessionError) {
      console.error('[KYC Mobile Start] Error fetching KYC session:', {
        token,
        error: sessionError.message,
        timestamp: new Date().toISOString(),
      })
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 400 }
      )
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check if session has expired
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    if (now > expiresAt) {
      await adminSupabase
        .from('kyc_sessions')
        .update({ status: 'expired' })
        .eq('id', session.id)

      return NextResponse.json(
        { error: 'Session has expired' },
        { status: 410 }
      )
    }

    // Check if session is already completed or failed
    if (session.status === 'completed' || session.status === 'failed') {
      return NextResponse.json(
        { error: `Session already ${session.status}` },
        { status: 400 }
      )
    }

    // Get environment variables
    const templateId = process.env.PERSONA_TEMPLATE_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (!templateId) {
      console.error('PERSONA_TEMPLATE_ID not configured')
      return NextResponse.json(
        { error: 'KYC system not properly configured' },
        { status: 500 }
      )
    }

    try {
      // Create Persona inquiry and one-time link
      // Persona will add ?inquiry-id=xxx&status=completed (or failed)
      const redirectUri = `${appUrl}/kyc/callback`

      const { inquiry, url } = await personaApi.createInquiryWithLink(
        templateId,
        session.user_id, // reference-id
        redirectUri
      )

      // Update session with inquiry ID and status
      // Note: initiated_from is preserved from when the session was created
      const { error: updateError } = await adminSupabase
        .from('kyc_sessions')
        .update({
          inquiry_id: inquiry.id,
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id)

      if (updateError) {
        console.error('[KYC Mobile Start] Error updating KYC session:', {
          sessionId: session.id,
          inquiryId: inquiry.id,
          error: updateError.message,
          timestamp: new Date().toISOString(),
        })
        // Continue anyway - inquiry was created
      }

      // Create verification record
      await adminSupabase
        .from('kyc_verifications')
        .insert({
          user_id: session.user_id,
          persona_inquiry_id: inquiry.id,
          status: 'pending',
        })

      // Redirect to Persona hosted flow
      return NextResponse.redirect(url)
    } catch (personaError) {
      console.error('[KYC Mobile Start] Error creating Persona inquiry:', {
        userId: session.user_id,
        sessionId: session.id,
        error: personaError instanceof Error ? personaError.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })

      // Update session status to failed
      await adminSupabase
        .from('kyc_sessions')
        .update({
          status: 'failed',
          callback_status: 'error_creating_inquiry',
        })
        .eq('id', session.id)

      return NextResponse.json(
        { error: 'Failed to create verification inquiry' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[KYC Mobile Start] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
