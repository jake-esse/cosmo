'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function VerificationPage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // Start countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="w-full">
      {/* Success Icon */}
      <div className="flex justify-center mb-8">
        <div className="w-20 h-20 bg-[#DFECC6] rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-[#485C11]" strokeWidth={2} />
        </div>
      </div>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="font-brand text-[36px] leading-[1.1] tracking-[-1.8px] text-black">
          Email Verified Successfully!
        </h1>
        <p className="mt-4 font-sans text-[16px] leading-[1.5] text-[#6F6F6F]">
          Your email has been confirmed. You can now sign in to your account and start earning equity rewards.
        </p>
      </div>

      {/* Countdown Message */}
      <div className="mb-6 text-center">
        <p className="font-sans text-[14px] text-[#929292]">
          Redirecting to homepage in {countdown} second{countdown !== 1 ? 's' : ''}...
        </p>
      </div>

      {/* Manual Continue Button */}
      <Link
        href="/"
        className="w-full flex items-center justify-center px-6 py-3.5 bg-[#485C11] text-white font-sans font-bold text-[14px] tracking-[-0.35px] rounded-[1000px] hover:bg-[#485C11]/90 transition-colors"
      >
        Continue to Homepage
      </Link>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#E9E9E9]"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 font-sans text-[14px] text-[#6F6F6F]">
            or
          </span>
        </div>
      </div>

      {/* Sign In Link */}
      <Link
        href="/login"
        className="w-full flex items-center justify-center px-6 py-3.5 bg-[#DFECC6] text-black font-sans font-bold text-[14px] tracking-[-0.35px] rounded-[1000px] hover:bg-[#DFECC6]/80 transition-colors"
      >
        Sign in to your account
      </Link>
    </div>
  )
}
