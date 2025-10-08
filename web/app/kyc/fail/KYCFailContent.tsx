/**
 * KYC Failure Page Content
 * Client component that handles search params
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { XCircle, AlertCircle, Mail, HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type FailureReason = 'duplicate' | 'declined' | 'error' | 'unknown'

interface FailureContent {
  icon: React.ReactNode
  title: string
  description: string
  canRetry: boolean
  helpText: string
}

const FAILURE_CONTENT: Record<FailureReason, FailureContent> = {
  duplicate: {
    icon: <AlertCircle className="w-8 h-8 text-amber-600" />,
    title: 'Account Already Exists',
    description: 'We found an existing account with this identity. Each person can only have one Ampel account.',
    canRetry: false,
    helpText: 'If you believe this is an error or need to access your existing account, please contact our support team.',
  },
  declined: {
    icon: <XCircle className="w-8 h-8 text-red-600" />,
    title: 'Verification Declined',
    description: 'We were unable to verify your identity with the information provided.',
    canRetry: false,
    helpText: 'This may happen if the ID document is expired, damaged, or doesn\'t meet our verification requirements. Please contact support for assistance.',
  },
  error: {
    icon: <HelpCircle className="w-8 h-8 text-gray-600" />,
    title: 'Verification Error',
    description: 'Something went wrong during the verification process.',
    canRetry: false,
    helpText: 'This is usually a temporary issue. Please contact support and we\'ll help you complete verification.',
  },
  unknown: {
    icon: <XCircle className="w-8 h-8 text-red-600" />,
    title: 'Verification Failed',
    description: 'We couldn\'t complete your verification at this time.',
    canRetry: false,
    helpText: 'Please contact our support team for assistance with completing your verification.',
  },
}

export default function KYCFailContent() {
  const searchParams = useSearchParams()
  const reason = (searchParams.get('reason') as FailureReason) || 'unknown'
  const content = FAILURE_CONTENT[reason] || FAILURE_CONTENT.unknown

  const handleContactSupport = () => {
    const subject = `KYC Verification Help - ${reason}`
    const body = `I need help with my identity verification.\\n\\nReason: ${reason}\\n\\nPlease provide additional details about your issue below:\\n\\n`
    window.location.href = `mailto:support@ampel.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const handleGoToDashboard = () => {
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl border-red-200">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              reason === 'duplicate' ? 'bg-amber-100' : 'bg-red-100'
            }`}>
              {content.icon}
            </div>
          </div>
          <CardTitle className="text-2xl text-gray-900">
            {content.title}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {content.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Specific guidance based on reason */}
          {reason === 'duplicate' && (
            <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                What This Means
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Our system detected that an identity matching the information you provided has already been verified for another Ampel account. This is a security measure to prevent duplicate accounts.
              </p>
            </div>
          )}

          {reason === 'declined' && (
            <div className="bg-red-50 border border-red-200/50 rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">
                Possible Reasons
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>ID document is expired or about to expire</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>ID document is damaged or altered</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>Document type is not supported in your region</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>Information on ID doesn&apos;t match our records</span>
                </li>
              </ul>
            </div>
          )}

          {(reason === 'error' || reason === 'unknown') && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                What Happened
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                An unexpected issue occurred during your verification. This could be a temporary technical problem or an issue with how your information was processed.
              </p>
            </div>
          )}

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200/50 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1 text-sm">
                  Need Help?
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {content.helpText}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleContactSupport}
              className="w-full h-12 bg-[#485C11] hover:bg-[#3a4a0e] text-white font-medium rounded-2xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
              size="lg"
            >
              <Mail className="w-5 h-5 mr-2" />
              Contact Support
            </Button>

            {reason === 'duplicate' && (
              <Button
                onClick={handleGoToDashboard}
                variant="outline"
                className="w-full h-12 rounded-2xl border-2"
                size="lg"
              >
                Go to Dashboard
              </Button>
            )}
          </div>

          {/* Support Info */}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Email: <a href="mailto:support@ampel.com" className="text-[#485C11] hover:underline">support@ampel.com</a>
              <br />
              Our team typically responds within 24 hours
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
