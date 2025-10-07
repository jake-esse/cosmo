import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { personaApi } from '@/lib/persona/client'

/**
 * GET /api/kyc/callback
 *
 * Handles Persona redirect after verification completion
 * Query params: status, inquiry-id, reference-id
 * - Updates session and verification records
 * - On success: creates persona_accounts record
 * - Redirects user to appropriate page
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const personaStatus = searchParams.get('status') // 'completed' or 'failed' from Persona
    const inquiryId = searchParams.get('inquiry-id')
    const referenceId = searchParams.get('reference-id') // This is user_id

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (!inquiryId) {
      console.error('[KYC Callback] Missing inquiry-id in callback:', {
        personaStatus,
        referenceId,
        timestamp: new Date().toISOString(),
      })
      return NextResponse.redirect(`${appUrl}/kyc/fail`)
    }

    const adminSupabase = createAdminClient()

    // Look up session by inquiry ID
    const { data: session, error: sessionError } = await adminSupabase
      .from('kyc_sessions')
      .select('*')
      .eq('inquiry_id', inquiryId)
      .maybeSingle()

    if (sessionError || !session) {
      console.error('[KYC Callback] Session not found for inquiry:', {
        inquiryId,
        error: sessionError?.message,
        timestamp: new Date().toISOString(),
      })
      return NextResponse.redirect(`${appUrl}/kyc/fail`)
    }

    try {
      // Fetch full inquiry details from Persona
      const inquiry = await personaApi.getInquiry(inquiryId)

      // Get account ID from inquiry relationships
      const accountId = inquiry.relationships?.account?.data?.id || null

      // Determine session status based on Persona's status and inquiry status
      let sessionStatus: 'completed' | 'failed' | 'in_progress' = 'in_progress'
      let verificationStatus: 'approved' | 'declined' | 'pending' | 'needs_review' = 'pending'

      // Persona sends status as 'completed' or 'failed'
      if (personaStatus === 'completed') {
        if (inquiry.attributes.status === 'approved') {
          sessionStatus = 'completed'
          verificationStatus = 'approved'
        } else if (inquiry.attributes.status === 'declined') {
          sessionStatus = 'failed'
          verificationStatus = 'declined'
        } else if (inquiry.attributes.status === 'needs_review') {
          sessionStatus = 'in_progress'
          verificationStatus = 'needs_review'
        } else {
          // Still pending
          sessionStatus = 'in_progress'
          verificationStatus = 'pending'
        }
      } else if (personaStatus === 'failed') {
        sessionStatus = 'failed'
        verificationStatus = 'declined'
      }

      // Update session
      const { error: updateSessionError } = await adminSupabase
        .from('kyc_sessions')
        .update({
          status: sessionStatus,
          callback_status: personaStatus || 'unknown',
          completed_at: sessionStatus === 'completed' || sessionStatus === 'failed'
            ? new Date().toISOString()
            : null,
        })
        .eq('id', session.id)

      if (updateSessionError) {
        console.error('[KYC Callback] Error updating session:', {
          sessionId: session.id,
          error: updateSessionError.message,
          timestamp: new Date().toISOString(),
        })
      }

      // Update or insert verification record
      const { error: verificationError } = await adminSupabase
        .from('kyc_verifications')
        .upsert({
          user_id: session.user_id,
          persona_inquiry_id: inquiryId,
          persona_account_id: accountId,
          status: verificationStatus,
          metadata: {
            inquiry_status: inquiry.attributes.status,
            callback_status: personaStatus,
            completed_at: inquiry.attributes['completed-at'],
          },
        }, {
          onConflict: 'persona_inquiry_id',
        })

      if (verificationError) {
        console.error('[KYC Callback] Error updating verification:', {
          userId: session.user_id,
          inquiryId,
          error: verificationError.message,
          timestamp: new Date().toISOString(),
        })
      }

      // If approved and we have an account ID, create persona_accounts record
      if (verificationStatus === 'approved' && accountId) {
        const { error: accountError } = await adminSupabase
          .from('persona_accounts')
          .upsert({
            user_id: session.user_id,
            persona_account_id: accountId,
          }, {
            onConflict: 'user_id',
          })

        if (accountError) {
          console.error('[KYC Callback] Error creating persona account:', {
            userId: session.user_id,
            accountId,
            error: accountError.message,
            timestamp: new Date().toISOString(),
          })
          // Don't fail the whole flow - account might already exist
        }
      }

      // Redirect based on final status AND flow context
      // Direct redirect to result pages to reduce redirect hops and preserve session
      if (sessionStatus === 'completed' && verificationStatus === 'approved') {
        // Check flow context to determine routing
        // - mobile_direct: User started on mobile → redirect to /kyc/success → /onboarding
        // - desktop_qr: User scanned QR from desktop → redirect to /kyc/complete-on-web (mobile terminal page)
        if (session.initiated_from === 'desktop_qr') {
          // QR code flow: mobile user sees "return to computer", desktop polls and redirects
          return NextResponse.redirect(`${appUrl}/kyc/complete-on-web`)
        } else {
          // Mobile direct flow: proceed to success page and onboarding
          return NextResponse.redirect(`${appUrl}/kyc/success`)
        }
      } else if (sessionStatus === 'failed' || verificationStatus === 'declined') {
        return NextResponse.redirect(`${appUrl}/kyc/fail`)
      } else if (verificationStatus === 'needs_review') {
        return NextResponse.redirect(`${appUrl}/kyc/pending`)
      } else {
        // Still in progress or pending
        return NextResponse.redirect(`${appUrl}/kyc/pending`)
      }
    } catch (personaError) {
      console.error('[KYC Callback] Error fetching inquiry from Persona:', {
        inquiryId,
        userId: session.user_id,
        error: personaError instanceof Error ? personaError.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })

      // Update session to failed
      await adminSupabase
        .from('kyc_sessions')
        .update({
          status: 'failed',
          callback_status: 'error_fetching_inquiry',
        })
        .eq('id', session.id)

      return NextResponse.redirect(`${appUrl}/kyc/fail`)
    }
  } catch (error) {
    console.error('[KYC Callback] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${appUrl}/kyc/fail`)
  }
}
