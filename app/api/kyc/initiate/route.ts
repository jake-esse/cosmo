import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { personaApi } from '@/lib/persona/client'
import { detectDevice } from '@/lib/utils/device-detection'
import { invalidateOldSessions } from '@/lib/kyc/edge-cases'
import type { InitiateKYCResponse } from '@/types/persona'
import { v4 as uuidv4 } from 'uuid'

/**
 * POST /api/kyc/initiate
 *
 * Initiates KYC verification flow
 * - Checks for existing Persona account (prevents duplicates)
 * - Detects device type from User-Agent
 * - Creates KYC session in database
 * - Desktop: returns session token for QR code generation
 * - Mobile: creates Persona inquiry and returns verification URL
 */
export async function POST(req: NextRequest) {
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

    // Use admin client for database operations (bypasses RLS)
    const adminSupabase = createAdminClient()

    // Check if user already has a Persona account
    const { data: existingAccount, error: accountCheckError } = await adminSupabase
      .from('persona_accounts')
      .select('id, persona_account_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (accountCheckError) {
      console.error('Error checking existing Persona account:', accountCheckError)
      return NextResponse.json(
        { error: 'Database error checking existing account' },
        { status: 500 }
      )
    }

    if (existingAccount) {
      return NextResponse.json(
        {
          success: false,
          error: 'User already has a verified Persona account',
        } as InitiateKYCResponse,
        { status: 400 }
      )
    }

    // Detect device type
    const userAgent = req.headers.get('user-agent')
    const deviceType = detectDevice(userAgent)

    if (deviceType === 'unknown') {
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to detect device type',
        } as InitiateKYCResponse,
        { status: 400 }
      )
    }

    // Generate session token
    const sessionToken = uuidv4()

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

    // Create redirect URI for Persona
    // Persona will add ?inquiry-id=xxx&status=completed (or failed)
    const redirectUri = `${appUrl}/kyc/callback`

    if (deviceType === 'desktop') {
      // Desktop flow: Create inquiry immediately with session_token as reference-id
      try {
        const { inquiry, url } = await personaApi.createInquiryWithLink(
          templateId,
          sessionToken, // Use session_token as reference-id for callback lookup
          redirectUri
        )

        // Create session with inquiry ID
        const { data: session, error: sessionError } = await adminSupabase
          .from('kyc_sessions')
          .insert({
            user_id: user.id,
            session_token: sessionToken,
            inquiry_id: inquiry.id,
            device_type: 'desktop',
            initiated_from: 'desktop_qr', // Track that this is a QR code flow
            status: 'pending',
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
          })
          .select()
          .single()

        if (sessionError || !session) {
          console.error('[KYC Initiate] Error creating session:', {
            userId: user.id,
            deviceType: 'desktop',
            inquiryId: inquiry.id,
            error: sessionError?.message,
            timestamp: new Date().toISOString(),
          })
          return NextResponse.json(
            { error: 'Failed to create verification session' },
            { status: 500 }
          )
        }

        console.log('[KYC Initiate] Desktop session created successfully:', {
          userId: user.id,
          sessionId: session.id,
          inquiryId: inquiry.id,
          sessionToken: sessionToken.substring(0, 8) + '...',
          initiatedFrom: 'desktop_qr',
          deviceType: 'desktop',
          status: 'pending',
          expiresAt: session.expires_at,
          timestamp: new Date().toISOString(),
        })

        // Invalidate any old incomplete sessions for this user
        await invalidateOldSessions(user.id, session.id)

        // Create verification record
        await adminSupabase
          .from('kyc_verifications')
          .insert({
            user_id: user.id,
            persona_inquiry_id: inquiry.id,
            status: 'pending',
          })

        // Return Persona URL directly for QR code (no intermediate pages)
        return NextResponse.json({
          success: true,
          deviceType: 'desktop',
          sessionToken,
          qrUrl: url, // Direct Persona URL
        } as InitiateKYCResponse)
      } catch (personaError) {
        console.error('[KYC Initiate] Error creating Persona inquiry:', {
          userId: user.id,
          deviceType: 'desktop',
          error: personaError instanceof Error ? personaError.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        })
        return NextResponse.json(
          { error: 'Failed to create verification inquiry' },
          { status: 500 }
        )
      }
    } else {
      // Mobile flow: Create inquiry immediately and redirect
      try {
        const { inquiry, url } = await personaApi.createInquiryWithLink(
          templateId,
          user.id, // reference-id
          redirectUri
        )

        // Create session with inquiry ID
        const { data: session, error: sessionError } = await adminSupabase
          .from('kyc_sessions')
          .insert({
            user_id: user.id,
            session_token: sessionToken,
            inquiry_id: inquiry.id,
            device_type: 'mobile',
            initiated_from: 'mobile_direct', // Track that this is a direct mobile flow
            status: 'in_progress',
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          })
          .select()
          .single()

        if (sessionError || !session) {
          console.error('[KYC Initiate] Error creating session:', {
            userId: user.id,
            deviceType: 'mobile',
            inquiryId: inquiry.id,
            error: sessionError?.message,
            timestamp: new Date().toISOString(),
          })
          return NextResponse.json(
            { error: 'Failed to create verification session' },
            { status: 500 }
          )
        }

        console.log('[KYC Initiate] Mobile session created successfully:', {
          userId: user.id,
          sessionId: session.id,
          inquiryId: inquiry.id,
          initiatedFrom: 'mobile_direct',
          deviceType: 'mobile',
          status: 'in_progress',
          expiresAt: session.expires_at,
          timestamp: new Date().toISOString(),
        })

        // Invalidate any old incomplete sessions for this user
        await invalidateOldSessions(user.id, session.id)

        // Create verification record
        await adminSupabase
          .from('kyc_verifications')
          .insert({
            user_id: user.id,
            persona_inquiry_id: inquiry.id,
            status: 'pending',
          })

        return NextResponse.json({
          success: true,
          deviceType: 'mobile',
          verificationUrl: url,
        } as InitiateKYCResponse)
      } catch (personaError) {
        console.error('[KYC Initiate] Error creating Persona inquiry:', {
          userId: user.id,
          deviceType: 'mobile',
          error: personaError instanceof Error ? personaError.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        })
        return NextResponse.json(
          { error: 'Failed to create verification inquiry' },
          { status: 500 }
        )
      }
    }
  } catch (error) {
    console.error('[KYC Initiate] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
