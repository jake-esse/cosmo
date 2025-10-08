/**
 * KYC Complete on Web Page
 * Shown to mobile users who scanned QR code from desktop
 * This is a terminal page - no redirect
 * Desktop will poll for completion and redirect to /onboarding
 */

import { CheckCircle2, Monitor, Smartphone, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function KYCCompleteOnWebPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-[#DFECC6]/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-green-200 shadow-xl">
        <CardContent className="pt-12 pb-8 px-6">
          <div className="flex flex-col items-center space-y-6">
            {/* Success Icon with Animation */}
            <div className="relative">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-20" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center space-y-3">
              <h1 className="font-brand text-3xl text-gray-900">
                Verification Complete!
              </h1>
              <p className="text-gray-600 text-base leading-relaxed">
                Your identity has been successfully verified.
              </p>
            </div>

            {/* Instructions for Desktop */}
            <div className="w-full bg-[#DFECC6]/30 border border-[#485C11]/20 rounded-2xl p-6 mt-2">
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 text-[#485C11]">
                  <Smartphone className="w-6 h-6" />
                  <ArrowRight className="w-5 h-5" />
                  <Monitor className="w-6 h-6" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-semibold text-gray-900">
                    Return to your computer
                  </p>
                  <p className="text-sm text-gray-700">
                    Your desktop browser will automatically continue to the next step.
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="w-full space-y-3 pt-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-sm text-gray-600 text-center">
                  You can safely close this window on your phone.
                  Continue on your computer to complete onboarding.
                </p>
              </div>
            </div>

            {/* Security Note */}
            <div className="pt-4 border-t border-gray-200 w-full">
              <p className="text-xs text-gray-500 text-center">
                Your verification was processed securely by Persona,
                our trusted identity verification partner.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
