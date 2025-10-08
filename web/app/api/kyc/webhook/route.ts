import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookSignature } from '@/lib/persona/webhook-verification'
import {
  linkAccountToUser,
  handleAccountConsolidation,
  DuplicateAccountError,
} from '@/lib/persona/account-manager'
import type {
  PersonaWebhookEvent,
  PersonaInquiry,
  PersonaAccount,
} from '@shared/types/persona'

/**
 * POST /api/kyc/webhook
 *
 * Handles Persona webhook events
 * - Verifies webhook signature (HMAC-SHA256)
 * - Processes inquiry and account events
 * - Updates verification status
 * - Implements idempotency via event ID tracking
 */
export async function POST(req: NextRequest) {
  const adminSupabase = createAdminClient()

  try {
    // Get webhook secret
    const webhookSecret = process.env.PERSONA_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('PERSONA_WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: 'Webhook handler not properly configured' },
        { status: 500 }
      )
    }

    // Get signature header
    const signatureHeader = req.headers.get('persona-signature')

    if (!signatureHeader) {
      console.error('Missing Persona-Signature header')
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 401 }
      )
    }

    // Get raw body for signature verification
    const rawBody = await req.text()

    // Verify signature
    const isValid = verifyWebhookSignature(
      rawBody,
      signatureHeader,
      webhookSecret
    )

    if (!isValid) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse webhook event
    const event: PersonaWebhookEvent = JSON.parse(rawBody)
    const eventId = event.data.id
    const eventName = event.data.attributes.name
    const payload = event.data.attributes.payload

    console.log(`Received webhook event: ${eventName} (${eventId})`)

    // Check for duplicate events (idempotency)
    const { data: existingEvent } = await adminSupabase
      .from('webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle()

    if (existingEvent) {
      console.log(`Event ${eventId} already processed, skipping`)
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Log the event for idempotency tracking
    await adminSupabase.from('webhook_events').insert({
      event_id: eventId,
      event_name: eventName,
      payload: payload,
    })

    // Route to appropriate handler
    if (eventName.startsWith('inquiry.')) {
      await handleInquiryEvent(eventName, payload.data as PersonaInquiry)
    } else if (eventName.startsWith('account.')) {
      await handleAccountEvent(eventName, payload.data as PersonaAccount)
    } else {
      console.log(`Unhandled event type: ${eventName}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Handle inquiry-related webhook events
 */
async function handleInquiryEvent(
  eventName: string,
  inquiry: PersonaInquiry
): Promise<void> {
  const adminSupabase = createAdminClient()
  const inquiryId = inquiry.id
  const referenceId = inquiry.attributes['reference-id']
  const inquiryStatus = inquiry.attributes.status

  console.log(
    `Processing inquiry event: ${eventName} for inquiry ${inquiryId}`
  )

  // Get associated account ID if available
  const accountId = inquiry.relationships?.account?.data?.id || null

  // Map Persona inquiry status to our verification status
  let verificationStatus: 'approved' | 'declined' | 'pending' | 'needs_review' =
    'pending'
  let sessionStatus: 'in_progress' | 'completed' | 'failed' = 'in_progress'

  switch (eventName) {
    case 'inquiry.created':
    case 'inquiry.started':
      verificationStatus = 'pending'
      sessionStatus = 'in_progress'
      break

    case 'inquiry.completed':
      // Wait for approval/decline event for final status
      verificationStatus = 'pending'
      sessionStatus = 'in_progress'
      break

    case 'inquiry.approved':
      verificationStatus = 'approved'
      sessionStatus = 'completed'

      // If approved and we have an account ID, link it
      if (accountId && referenceId) {
        try {
          await linkAccountToUser(accountId, referenceId)
        } catch (error) {
          if (error instanceof DuplicateAccountError) {
            console.error(
              `Duplicate account detected for inquiry ${inquiryId}:`,
              error.message
            )
            // Mark verification as declined due to duplicate
            verificationStatus = 'declined'
            sessionStatus = 'failed'
          } else {
            throw error
          }
        }
      }
      break

    case 'inquiry.declined':
    case 'inquiry.failed':
      verificationStatus = 'declined'
      sessionStatus = 'failed'
      break

    case 'inquiry.marked-for-review':
      verificationStatus = 'needs_review'
      sessionStatus = 'in_progress'
      break

    case 'inquiry.expired':
      verificationStatus = 'pending' // Keep as pending since they can retry
      sessionStatus = 'failed'
      break

    default:
      console.log(`Unhandled inquiry event: ${eventName}`)
      return
  }

  // Update or insert verification record
  const { error: verificationError } = await adminSupabase
    .from('kyc_verifications')
    .upsert(
      {
        user_id: referenceId || null,
        persona_inquiry_id: inquiryId,
        persona_account_id: accountId,
        status: verificationStatus,
        metadata: {
          inquiry_status: inquiryStatus,
          webhook_event: eventName,
          updated_at: new Date().toISOString(),
        },
      },
      {
        onConflict: 'persona_inquiry_id',
      }
    )

  if (verificationError) {
    console.error('Error updating verification:', verificationError)
  }

  // Update session if exists
  if (referenceId) {
    const { error: sessionError } = await adminSupabase
      .from('kyc_sessions')
      .update({
        status: sessionStatus,
        completed_at:
          sessionStatus === 'completed' || sessionStatus === 'failed'
            ? new Date().toISOString()
            : null,
      })
      .eq('inquiry_id', inquiryId)

    if (sessionError) {
      console.error('Error updating session:', sessionError)
    }
  }

  console.log(
    `Updated inquiry ${inquiryId}: verification=${verificationStatus}, session=${sessionStatus}`
  )
}

/**
 * Handle account-related webhook events
 */
async function handleAccountEvent(
  eventName: string,
  account: PersonaAccount
): Promise<void> {
  console.log(`Processing account event: ${eventName} for account ${account.id}`)

  switch (eventName) {
    case 'account.created':
      // Account created - link to user if we have a reference ID
      const referenceId = account.attributes['reference-id']

      if (referenceId) {
        try {
          await linkAccountToUser(account.id, referenceId)
        } catch (error) {
          if (error instanceof DuplicateAccountError) {
            console.error(
              `Cannot link account ${account.id}: ${error.message}`
            )
          } else {
            throw error
          }
        }
      }
      break

    case 'account.consolidated':
      // Account was merged with another account
      // Payload structure for consolidated events may include both accounts
      // This is a simplified handler - real implementation may need to extract
      // secondary account ID from the payload metadata
      console.warn(
        `Account consolidation event received for ${account.id}. Manual review may be needed.`
      )
      // Note: Full implementation would call handleAccountConsolidation()
      // with both account IDs, but Persona's webhook payload structure
      // for consolidation events needs to be verified
      break

    case 'account.redacted':
    case 'account.archived':
      // Handle account deletion/archival
      console.log(`Account ${account.id} was ${eventName.split('.')[1]}`)
      // Could optionally mark user's verification as invalid
      break

    default:
      console.log(`Unhandled account event: ${eventName}`)
  }
}
