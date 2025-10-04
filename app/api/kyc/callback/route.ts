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
      console.error('Missing inquiry-id in callback')
      return NextResponse.redirect(`${appUrl}/kyc/error?reason=missing_inquiry_id`)
    }

    const adminSupabase = createAdminClient()

    // Look up session by inquiry ID
    const { data: session, error: sessionError } = await adminSupabase
      .from('kyc_sessions')
      .select('*')
      .eq('inquiry_id', inquiryId)
      .maybeSingle()

    if (sessionError || !session) {
      console.error('Session not found for inquiry:', inquiryId)
      return NextResponse.redirect(`${appUrl}/kyc/error?reason=session_not_found`)
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
        console.error('Error updating session:', updateSessionError)
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
        console.error('Error updating verification:', verificationError)
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
          console.error('Error creating persona account:', accountError)
          // Don't fail the whole flow - account might already exist
        }
      }

      // Redirect based on final status
      if (sessionStatus === 'completed' && verificationStatus === 'approved') {
        return NextResponse.redirect(`${appUrl}/dashboard?kyc=success`)
      } else if (sessionStatus === 'failed' || verificationStatus === 'declined') {
        return NextResponse.redirect(`${appUrl}/kyc/failed`)
      } else if (verificationStatus === 'needs_review') {
        return NextResponse.redirect(`${appUrl}/kyc/pending`)
      } else {
        // Still in progress or pending
        return NextResponse.redirect(`${appUrl}/kyc/processing`)
      }
    } catch (personaError) {
      console.error('Error fetching inquiry from Persona:', personaError)

      // Update session to failed
      await adminSupabase
        .from('kyc_sessions')
        .update({
          status: 'failed',
          callback_status: 'error_fetching_inquiry',
        })
        .eq('id', session.id)

      return NextResponse.redirect(`${appUrl}/kyc/error?reason=persona_api_error`)
    }
  } catch (error) {
    console.error('Error in KYC callback:', error)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${appUrl}/kyc/error?reason=internal_error`)
  }
}
