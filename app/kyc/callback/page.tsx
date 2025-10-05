/**
 * KYC Callback Page
 * Handles Persona redirect and routes to appropriate result page
 */

'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function KYCCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const handleCallback = () => {
      // Get params from Persona redirect
      const status = searchParams.get('status')
      const inquiryId = searchParams.get('inquiry-id')
      const kycStatus = searchParams.get('kyc') // From our API redirect

      // Clear any session storage
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('kyc_inquiry_id')
        sessionStorage.removeItem('kyc_session_token')
      }

      // Route based on status
      if (kycStatus === 'success' || status === 'completed') {
        router.push('/kyc/success')
      } else if (kycStatus === 'retry' || status === 'retry') {
        router.push('/kyc/retry')
      } else if (kycStatus === 'failed' || status === 'failed') {
        router.push('/kyc/fail')
      } else if (kycStatus === 'pending') {
        // Needs manual review
        router.push('/kyc/pending')
      } else if (kycStatus === 'already_verified') {
        // Already has account
        router.push('/dashboard?kyc=already_verified')
      } else {
        // Unknown status or error
        console.warn('Unknown KYC callback status:', { status, kycStatus, inquiryId })
        router.push('/kyc/fail')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="w-12 h-12 text-[#485C11] animate-spin" />
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-gray-900">
              Processing verification...
            </p>
            <p className="text-sm text-gray-600">
              Please wait while we confirm your identity.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
