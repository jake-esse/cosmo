/**
 * KYC Pending Page
 * Displayed when verification needs manual review
 */

'use client'

import { Clock, Shield, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function KYCPendingPage() {
  const handleGoToDashboard = () => {
    window.location.href = '/dashboard'
  }

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@ampel.com?subject=KYC%20Verification%20Status'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl border-blue-200">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-gray-900">
            Verification Under Review
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Your identity verification is currently being reviewed by our team.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* What This Means */}
          <div className="bg-blue-50 border border-blue-200/50 rounded-2xl p-5">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">
              What This Means
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              Your verification requires additional review. This is a normal part of our security process and happens for various reasons:
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Additional verification of document authenticity</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Unclear photo quality requiring human review</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Routine security checks</span>
              </li>
            </ul>
          </div>

          {/* Timeline */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1 text-sm">
                  Review Timeline
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Our verification team typically completes manual reviews within <strong>1-3 business days</strong>. We&apos;ll notify you via email as soon as your verification is complete.
                </p>
              </div>
            </div>
          </div>

          {/* What Happens Next */}
          <div className="bg-[#DFECC6]/30 border border-[#485C11]/20 rounded-2xl p-5">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">
              What Happens Next
            </h3>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#485C11] text-white rounded-full flex items-center justify-center text-xs font-semibold">
                  1
                </span>
                <span className="text-sm text-gray-700 pt-0.5">
                  Our team will review your verification documents
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#485C11] text-white rounded-full flex items-center justify-center text-xs font-semibold">
                  2
                </span>
                <span className="text-sm text-gray-700 pt-0.5">
                  You&apos;ll receive an email notification with the result
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#485C11] text-white rounded-full flex items-center justify-center text-xs font-semibold">
                  3
                </span>
                <span className="text-sm text-gray-700 pt-0.5">
                  Once approved, you&apos;ll gain full access to Ampel
                </span>
              </li>
            </ol>
          </div>

          {/* Important Note */}
          <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4">
            <p className="text-sm text-amber-900">
              <strong>No action needed:</strong> We have everything we need. Please wait for our email confirmation.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleGoToDashboard}
              className="w-full h-12 bg-[#485C11] hover:bg-[#3a4a0e] text-white font-medium rounded-2xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
              size="lg"
            >
              Go to Dashboard
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

          {/* Support Info */}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Questions about your review? Email us at{' '}
              <a href="mailto:support@ampel.com" className="text-[#485C11] hover:underline">
                support@ampel.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
