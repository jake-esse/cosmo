/**
 * DesktopQRFlow Component
 * Desktop QR code flow for mobile handoff verification
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QRCodeDisplay } from './QRCodeDisplay'
import { useKYCStatus } from '@/lib/hooks/useKYCStatus'
import type { InitiateKYCResponse } from '@/types/persona'

const SESSION_DURATION_MS = 30 * 60 * 1000 // 30 minutes

export function DesktopQRFlow() {
  const router = useRouter()

  // API call state
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [initiateError, setInitiateError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  // Redirect state
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false)

  // Timer state
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(SESSION_DURATION_MS)

  // Use status polling hook
  const { data: statusData, error: statusError } = useKYCStatus(
    sessionToken,
    !!sessionToken
  )

  // Initiate KYC session on mount
  useEffect(() => {
    const initiateSession = async () => {
      try {
        console.log('[DesktopQRFlow] Initiating KYC session...')
        setLoading(true)
        setInitiateError(null)

        const response = await fetch('/api/kyc/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        console.log('[DesktopQRFlow] API response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('[DesktopQRFlow] API error response:', errorText)
          throw new Error(`HTTP ${response.status}: Failed to initiate verification`)
        }

        const data: InitiateKYCResponse = await response.json()
        console.log('[DesktopQRFlow] API response data:', {
          success: data.success,
          deviceType: data.deviceType,
          hasSessionToken: !!data.sessionToken,
          hasQrUrl: !!data.qrUrl,
          qrUrlLength: data.qrUrl?.length || 0,
        })

        if (!data.success) {
          console.error('[DesktopQRFlow] API returned success=false:', data.error)
          throw new Error(data.error || 'Failed to initiate verification')
        }

        if (data.sessionToken && data.qrUrl) {
          console.log('[DesktopQRFlow] Setting session token and QR URL:', {
            sessionToken: data.sessionToken.substring(0, 8) + '...',
            qrUrl: data.qrUrl,
          })
          setSessionToken(data.sessionToken)
          setQrUrl(data.qrUrl)
          setExpiresAt(new Date(Date.now() + SESSION_DURATION_MS))
        } else {
          console.error('[DesktopQRFlow] Missing sessionToken or qrUrl in response:', {
            hasSessionToken: !!data.sessionToken,
            hasQrUrl: !!data.qrUrl,
          })
          throw new Error('Invalid response from server')
        }

        console.log('[DesktopQRFlow] Session initiated successfully')
        setLoading(false)
      } catch (err) {
        console.error('[DesktopQRFlow] Error initiating session:', err)
        setInitiateError(err instanceof Error ? err.message : 'Failed to start verification')
        setLoading(false)
      }
    }

    initiateSession()
  }, [])

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return

    const interval = setInterval(() => {
      const remaining = expiresAt.getTime() - Date.now()
      setTimeRemaining(Math.max(0, remaining))

      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  // Auto-redirect on completion
  useEffect(() => {
    if (!statusData?.status || isRedirecting) return

    console.log('[DesktopQRFlow] Status changed:', {
      status: statusData.status,
      completed: statusData.completed,
      inquiryId: statusData.inquiryId,
    })

    // Handle completed verification
    if (statusData.status === 'completed') {
      console.log('[DesktopQRFlow] Verification completed - initiating redirect to /onboarding')
      setIsRedirecting(true)

      // Small delay for UX (let user see success message)
      setTimeout(() => {
        console.log('[DesktopQRFlow] Executing redirect to /onboarding')
        // Refresh router to ensure middleware runs and profile is re-fetched
        router.refresh()
        router.push('/onboarding')
      }, 1500)
    }
  }, [statusData?.status, statusData?.completed, statusData?.inquiryId, router, isRedirecting])

  // Format time remaining
  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Email link fallback
  const handleEmailLink = () => {
    if (!qrUrl) return
    const subject = 'Complete Your Identity Verification'
    const body = `Click this link on your mobile device to complete verification:\n\n${qrUrl}`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  // Retry handler
  const handleRetry = () => {
    window.location.reload()
  }

  // Error state
  if (initiateError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Verification Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">{initiateError}</p>
            <Button onClick={handleRetry} className="w-full" variant="default">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  if (loading || !qrUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="w-12 h-12 text-[#485C11] animate-spin" />
            <p className="text-lg font-medium text-gray-900">
              Setting up verification...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Expired state
  if (timeRemaining === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <Clock className="w-5 h-5" />
              Session Expired
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              Your verification session has expired. Please start a new verification.
            </p>
            <Button onClick={handleRetry} className="w-full" variant="default">
              Start New Verification
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Failed state
  if (statusData?.status === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Verification Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              Your verification could not be completed. Please try again.
            </p>
            <Button onClick={handleRetry} className="w-full" variant="default">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Completed state (shown briefly before redirect)
  if (statusData?.status === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900">
                Verification Complete!
              </h2>
              {isRedirecting ? (
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p>Redirecting to onboarding...</p>
                </div>
              ) : (
                <p className="text-gray-600">Redirecting you now...</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main QR code display
  const isInProgress = statusData?.status === 'in_progress'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="font-brand text-3xl text-gray-900">
            Mobile Identity Verification
          </h1>
          <p className="text-gray-600">
            Scan the QR code with your mobile device to continue
          </p>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#485C11]" />
                Scan QR Code
              </span>
              <span className="flex items-center gap-2 text-sm font-normal text-gray-600">
                <Clock className="w-4 h-4" />
                {formatTime(timeRemaining)}
              </span>
            </CardTitle>
            <CardDescription>
              Use your phone&apos;s camera to scan the code below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Status Banner */}
            {isInProgress && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900">
                    Verification in progress
                  </p>
                  <p className="text-sm text-blue-700">
                    Complete the verification on your mobile device
                  </p>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {statusError && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-800">{statusError}</p>
              </div>
            )}

            {/* QR Code and Instructions */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* QR Code */}
              <div className="flex justify-center">
                {qrUrl ? (
                  <QRCodeDisplay url={qrUrl} size={300} />
                ) : (
                  <div className="bg-gray-100 border-2 border-gray-300 rounded-2xl p-8 flex items-center justify-center" style={{ width: 300, height: 300 }}>
                    <p className="text-gray-500 text-center">Loading QR code...</p>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-4">
                    How to verify:
                  </h3>
                  <ol className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-[#485C11] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                        1
                      </span>
                      <span className="text-gray-700 pt-0.5">
                        Open your phone&apos;s camera app
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-[#485C11] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                        2
                      </span>
                      <span className="text-gray-700 pt-0.5">
                        Point it at the QR code above
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-[#485C11] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                        3
                      </span>
                      <span className="text-gray-700 pt-0.5">
                        Tap the notification to open the verification page
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-[#485C11] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                        4
                      </span>
                      <span className="text-gray-700 pt-0.5">
                        Follow the on-screen instructions to verify your identity
                      </span>
                    </li>
                  </ol>
                </div>

                {/* Email Fallback */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-3">
                    Can&apos;t scan the code?
                  </p>
                  <Button
                    onClick={handleEmailLink}
                    variant="outline"
                    className="w-full"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email Link to Phone
                  </Button>
                </div>
              </div>
            </div>

            {/* Security Note */}
            <div className="bg-[#DFECC6]/30 border border-[#485C11]/20 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Secure verification:</span> Your
                identity verification is handled by our trusted partner, Persona.
                Your information is encrypted and protected.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-500">
          This QR code expires in {formatTime(timeRemaining)}. Keep this window
          open until verification is complete.
        </p>
      </div>
    </div>
  )
}
