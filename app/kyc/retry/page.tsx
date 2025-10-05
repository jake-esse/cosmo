/**
 * KYC Retry Page
 * Displayed when verification needs to be retried
 */

'use client'

import { useRouter } from 'next/navigation'
import { RotateCcw, Lightbulb, Camera, Sun, CreditCard, User, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function KYCRetryPage() {
  const router = useRouter()

  const handleRetry = () => {
    router.push('/kyc/start')
  }

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@ampel.com?subject=KYC%20Verification%20Help'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <RotateCcw className="w-8 h-8 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-gray-900">
            Let&apos;s Try That Again
          </CardTitle>
          <CardDescription className="text-base mt-2">
            We couldn&apos;t complete your verification. This usually happens due to photo quality issues.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tips Section */}
          <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-gray-900">
                Tips for Successful Verification
              </h3>
            </div>

            <div className="space-y-3">
              {/* Lighting Tip */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <Sun className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-medium text-gray-900 text-sm">Good Lighting</p>
                  <p className="text-sm text-gray-600">
                    Use natural light or bright indoor lighting. Avoid shadows on your ID or face.
                  </p>
                </div>
              </div>

              {/* Photo Quality Tip */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <Camera className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-medium text-gray-900 text-sm">Clear Photos</p>
                  <p className="text-sm text-gray-600">
                    Hold your device steady. Make sure all text on your ID is readable and not blurry.
                  </p>
                </div>
              </div>

              {/* ID Visibility Tip */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-medium text-gray-900 text-sm">Full ID Visible</p>
                  <p className="text-sm text-gray-600">
                    Ensure your entire ID is within the frame. No parts should be cut off or covered.
                  </p>
                </div>
              </div>

              {/* Selfie Match Tip */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-medium text-gray-900 text-sm">Selfie Match</p>
                  <p className="text-sm text-gray-600">
                    Face the camera directly. Remove sunglasses or hats that may obscure your face.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Common Issues */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">
              Common Issues:
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">•</span>
                <span>Photo was too blurry or out of focus</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">•</span>
                <span>Lighting was too dark or caused glare</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">•</span>
                <span>Part of your ID was cut off or not visible</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">•</span>
                <span>Selfie photo didn&apos;t match your ID photo clearly</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleRetry}
              className="w-full h-12 bg-[#485C11] hover:bg-[#3a4a0e] text-white font-medium rounded-2xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
              size="lg"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Retry Verification
            </Button>

            <Button
              onClick={handleContactSupport}
              variant="outline"
              className="w-full h-12 rounded-2xl border-2"
              size="lg"
            >
              <Mail className="w-5 h-5 mr-2" />
              Contact Support
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-gray-500 text-center pt-2">
            Having trouble? Our support team is here to help you complete verification.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
