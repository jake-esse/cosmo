/**
 * KYC Start Page
 * Entry point for KYC verification with device detection
 */

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { detectDevice } from '@shared/utils/device-detection'
import { DesktopQRFlow } from '@/components/kyc/DesktopQRFlow'
import { MobileDirectFlow } from '@/components/kyc/MobileDirectFlow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default async function KYCStartPage() {
  // Authenticate user
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login?redirect=/kyc/start')
  }

  // Check if user already has a verified Persona account
  const adminSupabase = createAdminClient()
  const { data: existingAccount } = await adminSupabase
    .from('persona_accounts')
    .select('id, persona_account_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingAccount) {
    // User already verified, redirect to dashboard
    redirect('/dashboard?kyc=already_verified')
  }

  // Check for active KYC session
  const { data: activeSession } = await adminSupabase
    .rpc('get_active_session', { p_user_id: user.id })

  // If there's a completed session, redirect
  if (activeSession && activeSession.length > 0) {
    const session = activeSession[0]
    if (session.status === 'completed') {
      redirect('/onboarding')
    }
  }

  // Detect device type from User-Agent
  const headersList = await headers()
  const userAgent = headersList.get('user-agent')
  const deviceType = detectDevice(userAgent)

  // Handle unknown device type
  if (deviceType === 'unknown') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-5 h-5" />
              Device Detection Issue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              We couldn&apos;t detect your device type. Please try one of the following:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
              <li>Use a modern web browser (Chrome, Safari, Firefox, Edge)</li>
              <li>Enable JavaScript in your browser</li>
              <li>Try accessing from a different device</li>
            </ul>
            <p className="text-sm text-gray-600">
              If the problem persists, please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Route based on device type
  if (deviceType === 'mobile') {
    return <MobileDirectFlow />
  } else {
    return <DesktopQRFlow />
  }
}
