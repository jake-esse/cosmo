/**
 * MobileDirectFlow Component
 * Handles direct mobile verification flow
 */

'use client'

import { useEffect, useState } from 'react'
import { Smartphone, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { InitiateKYCResponse } from '@/types/persona'

export function MobileDirectFlow() {
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null)

  useEffect(() => {
    const initiateVerification = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/kyc/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to initiate verification`)
        }

        const data: InitiateKYCResponse = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Failed to initiate verification')
        }

        if (data.verificationUrl) {
          setVerificationUrl(data.verificationUrl)
          // Redirect to Persona hosted flow
          window.location.href = data.verificationUrl
        } else {
          throw new Error('No verification URL received')
        }
      } catch (err) {
        console.error('Error initiating verification:', err)
        setError(err instanceof Error ? err.message : 'Failed to start verification')
        setLoading(false)
      }
    }

    initiateVerification()
  }, [])

  const handleRetry = () => {
    window.location.reload()
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Verification Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">{error}</p>
            <Button
              onClick={handleRetry}
              className="w-full"
              variant="default"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

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

          {/* Manual Redirect (if auto-redirect fails) */}
          {verificationUrl && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center mb-3">
                Not redirected automatically?
              </p>
              <Button
                onClick={() => window.location.href = verificationUrl}
                className="w-full"
                variant="outline"
              >
                Click here to continue
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
