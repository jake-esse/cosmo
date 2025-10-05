/**
 * Mobile KYC Token Page
 * Handles QR code scans and email links from desktop flow
 */

import { Suspense } from 'react'
import { Loader2, Smartphone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MobileTokenContent from './MobileTokenContent'

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-center">
            <Smartphone className="w-6 h-6 text-[#485C11]" />
            Loading...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-12 h-12 text-[#485C11] animate-spin" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-gray-900">
                Preparing verification...
              </p>
              <p className="text-sm text-gray-600">
                Please wait a moment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function MobileTokenPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MobileTokenContent />
    </Suspense>
  )
}
