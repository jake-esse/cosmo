/**
 * Mobile KYC Token Page
 * Handles QR code scans and email links from desktop flow
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, AlertCircle, Clock, Smartphone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function MobileTokenPage() {
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'expired' | 'invalid' | 'general'>('general')

  useEffect(() => {
    const initiateVerification = async () => {
      if (!token) {
        setError('Invalid verification link')
        setErrorType('invalid')
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // Call the mobile-start API which validates token and creates inquiry
        const response = await fetch(`/api/kyc/mobile-start/${token}`, {
          method: 'GET',
          redirect: 'manual', // Don't follow redirects automatically
        })

        // Check for redirect response (expected)
        if (response.type === 'opaqueredirect' || response.status === 0) {
          // This is a redirect - let it happen
          window.location.href = `/api/kyc/mobile-start/${token}`
          return
        }

        // If we got here, something went wrong
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))

          if (response.status === 410) {
            setError('This verification link has expired. Please scan a new QR code or request a new link.')
            setErrorType('expired')
          } else if (response.status === 404) {
            setError('This verification link is not valid. Please scan the QR code again.')
            setErrorType('invalid')
          } else if (response.status === 400 && data.error?.includes('already')) {
            setError('This verification has already been completed or cancelled.')
            setErrorType('invalid')
          } else {
            setError(data.error || 'Failed to start verification. Please try again.')
            setErrorType('general')
          }

          setLoading(false)
          return
        }

        // If we get a successful response but no redirect, handle it
        const data = await response.json()
        if (data.error) {
          setError(data.error)
          setErrorType('general')
        }

        setLoading(false)
      } catch (err) {
        console.error('Error initiating verification:', err)
        setError('Failed to start verification. Please check your connection and try again.')
        setErrorType('general')
        setLoading(false)
      }
    }

    initiateVerification()
  }, [token])

  const handleRetry = () => {
    window.location.reload()
  }

  const handleBackToDesktop = () => {
    window.location.href = '/kyc/start'
  }

  // Error states
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              {errorType === 'expired' ? (
                <Clock className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {errorType === 'expired' ? 'Link Expired' : 'Verification Error'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">{error}</p>

            <div className="space-y-2">
              {errorType === 'expired' || errorType === 'invalid' ? (
                <Button
                  onClick={handleBackToDesktop}
                  className="w-full"
                  variant="default"
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Get New QR Code
                </Button>
              ) : (
                <Button
                  onClick={handleRetry}
                  className="w-full"
                  variant="default"
                >
                  Try Again
                </Button>
              )}
            </div>

            <p className="text-xs text-gray-500 text-center">
              Need help? Contact support at support@ampel.com
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-center">
            <Smartphone className="w-6 h-6 text-[#485C11]" />
            Starting Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loading State */}
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-12 h-12 text-[#485C11] animate-spin" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-gray-900">
                Preparing your verification...
              </p>
              <p className="text-sm text-gray-600">
                You&apos;ll be redirected to our verification partner in a moment.
              </p>
            </div>
          </div>

          {/* Security note */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              🔒 Your information is encrypted and secure
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
