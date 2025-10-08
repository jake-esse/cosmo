/**
 * KYC Callback Page
 * Handles Persona redirect and routes to appropriate result page
 */

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import KYCCallbackContent from './KYCCallbackContent'

// Loading fallback for Suspense
function LoadingFallback() {
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

export default function KYCCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <KYCCallbackContent />
    </Suspense>
  )
}
