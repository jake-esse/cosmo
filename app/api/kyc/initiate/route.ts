import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { personaApi } from '@/lib/persona/client'
import { detectDevice } from '@/lib/utils/device-detection'
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

    // Create base redirect URIs
    const callbackBaseUrl = `${appUrl}/api/kyc/callback`

    if (deviceType === 'desktop') {
      // Desktop flow: Create session, return token for QR code
      const { error: sessionError } = await adminSupabase
        .from('kyc_sessions')
        .insert({
          user_id: user.id,
          session_token: sessionToken,
          device_type: 'desktop',
          status: 'pending',
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        })

      if (sessionError) {
        console.error('Error creating KYC session:', sessionError)
        return NextResponse.json(
          { error: 'Failed to create verification session' },
          { status: 500 }
        )
      }

      // Generate QR code URL (mobile device will scan this)
      const qrUrl = `${appUrl}/api/kyc/mobile-start/${sessionToken}`

      return NextResponse.json({
        success: true,
        deviceType: 'desktop',
        sessionToken,
        qrUrl,
      } as InitiateKYCResponse)
    } else {
      // Mobile flow: Create inquiry immediately and redirect
      try {
        const redirectUri = `${callbackBaseUrl}?status=success`

        const { inquiry, url } = await personaApi.createInquiryWithLink(
          templateId,
          user.id, // reference-id
          redirectUri
        )

        // Create session with inquiry ID
        const { error: sessionError } = await adminSupabase
          .from('kyc_sessions')
          .insert({
            user_id: user.id,
            session_token: sessionToken,
            inquiry_id: inquiry.id,
            device_type: 'mobile',
            status: 'in_progress',
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          })

        if (sessionError) {
          console.error('Error creating KYC session:', sessionError)
          return NextResponse.json(
            { error: 'Failed to create verification session' },
            { status: 500 }
          )
        }

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
        console.error('Error creating Persona inquiry:', personaError)
        return NextResponse.json(
          { error: 'Failed to create verification inquiry' },
          { status: 500 }
        )
      }
    }
  } catch (error) {
    console.error('Error in KYC initiate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
