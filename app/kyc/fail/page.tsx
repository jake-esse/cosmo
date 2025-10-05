/**
 * KYC Failure Page
 * Displayed when verification fails or duplicate account detected
 */

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import KYCFailContent from './KYCFailContent'

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl border-red-200">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-gray-900">
              Loading verification status...
            </p>
            <p className="text-sm text-gray-600">
              Please wait a moment.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function KYCFailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <KYCFailContent />
    </Suspense>
  )
}
