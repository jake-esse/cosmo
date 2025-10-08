/**
 * KYC Success Content Component
 * Client component for success page with countdown and redirect
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Sparkles, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const REDIRECT_DELAY_MS = 3000 // 3 seconds

export default function KYCSuccessContent() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)

    // Auto-redirect
    const redirectTimer = setTimeout(() => {
      router.push('/onboarding')
    }, REDIRECT_DELAY_MS)

    return () => {
      clearInterval(countdownInterval)
      clearTimeout(redirectTimer)
    }
  }, [router])

  const handleContinue = () => {
    router.push('/onboarding')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-[#DFECC6]/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-green-200 shadow-xl">
        <CardContent className="pt-12 pb-8 px-6">
          {/* Success Icon with Animation */}
          <div className="flex flex-col items-center space-y-6">
            {/* Animated Success Circle */}
            <div className="relative">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-20" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
              </div>
              {/* Sparkle decorations */}
              <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse" />
              <Sparkles className="absolute -bottom-1 -left-1 w-6 h-6 text-yellow-400 animate-pulse delay-100" />
            </div>

            {/* Success Message */}
            <div className="text-center space-y-3">
              <h1 className="font-brand text-3xl text-gray-900">
                Verification Complete!
              </h1>
              <p className="text-gray-600 text-base leading-relaxed max-w-sm mx-auto">
                Your identity has been successfully verified. Welcome to Ampel!
              </p>
            </div>

            {/* Next Steps */}
            <div className="w-full bg-[#DFECC6]/30 border border-[#485C11]/20 rounded-2xl p-4 mt-2">
              <p className="text-sm text-gray-700 text-center">
                🎉 You&apos;re all set! Let&apos;s complete your onboarding and get you started.
              </p>
            </div>

            {/* Continue Button */}
            <div className="w-full space-y-3 pt-4">
              <Button
                onClick={handleContinue}
                className="w-full h-12 bg-[#485C11] hover:bg-[#3a4a0e] text-white font-medium rounded-2xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
                size="lg"
              >
                Continue to Onboarding
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>

              {/* Auto-redirect notice */}
              {countdown > 0 && (
                <p className="text-xs text-gray-500 text-center">
                  Automatically continuing in {countdown}...
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
