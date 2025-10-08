'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function CheckEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  const [isResending, setIsResending] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Check for existing session on mount
  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        // User already has active session, redirect to KYC
        router.push('/kyc/start')
      }
    }

    checkSession()
  }, [router])

  // Redirect to signup if no email provided
  useEffect(() => {
    if (!email) {
      router.push('/signup')
    }
  }, [email, router])

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCountdown])

  async function handleResendEmail() {
    if (!email || resendCountdown > 0) return

    setIsResending(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) {
        setErrorMessage(error.message || 'Failed to resend verification email')
      } else {
        setSuccessMessage('Verification email sent! Check your inbox.')
        setResendCountdown(60) // 60 second cooldown
      }
    } catch (error) {
      console.error('Resend error:', error)
      setErrorMessage('An unexpected error occurred')
    } finally {
      setIsResending(false)
    }
  }

  if (!email) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="w-full">
      {/* Mail Icon */}
      <div className="flex justify-center mb-8">
        <div className="w-20 h-20 bg-[#DFECC6] rounded-full flex items-center justify-center">
          <Mail className="w-10 h-10 text-[#485C11]" strokeWidth={2} />
        </div>
      </div>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="font-brand text-[36px] leading-[1.1] tracking-[-1.8px] text-black">
          Check your email
        </h1>
        <p className="mt-4 font-sans text-[16px] leading-[1.5] text-[#6F6F6F]">
          We sent a verification link to
        </p>
        <p className="mt-2 font-sans font-semibold text-[16px] text-black">
          {email}
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 rounded-[12px] bg-[#DFECC6] border border-[#485C11]/20 p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-[#485C11] mr-2 flex-shrink-0" />
            <p className="font-sans text-[14px] text-[#485C11]">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 rounded-[12px] bg-red-50 border border-red-200 p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
            <p className="font-sans text-[14px] text-red-600">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="mb-8 bg-[#F9F9F9] rounded-[12px] p-6">
        <h2 className="font-sans font-bold text-[14px] text-black mb-4">
          Next steps:
        </h2>
        <ol className="space-y-3">
          <li className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 bg-[#485C11] text-white rounded-full flex items-center justify-center font-sans font-bold text-[12px] mr-3">
              1
            </span>
            <span className="font-sans text-[14px] text-[#6F6F6F] pt-0.5">
              Check your email for the verification link
            </span>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 bg-[#485C11] text-white rounded-full flex items-center justify-center font-sans font-bold text-[12px] mr-3">
              2
            </span>
            <span className="font-sans text-[14px] text-[#6F6F6F] pt-0.5">
              Click the link to verify your account
            </span>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 bg-[#485C11] text-white rounded-full flex items-center justify-center font-sans font-bold text-[12px] mr-3">
              3
            </span>
            <span className="font-sans text-[14px] text-[#6F6F6F] pt-0.5">
              Complete KYC verification
            </span>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 bg-[#485C11] text-white rounded-full flex items-center justify-center font-sans font-bold text-[12px] mr-3">
              4
            </span>
            <span className="font-sans text-[14px] text-[#6F6F6F] pt-0.5">
              Start earning shares!
            </span>
          </li>
        </ol>
      </div>

      {/* Spam Folder Tip */}
      <div className="mb-6 p-4 bg-[#F9F9F9] rounded-[12px] border border-[#E9E9E9]">
        <p className="font-sans text-[13px] text-[#6F6F6F]">
          💡 <span className="font-medium">Tip:</span> Can&apos;t find the email? Check your spam or junk folder.
        </p>
      </div>

      {/* Resend Email Button */}
      <button
        onClick={handleResendEmail}
        disabled={isResending || resendCountdown > 0}
        className="w-full flex items-center justify-center px-6 py-3.5 bg-[#485C11] text-white font-sans font-bold text-[14px] tracking-[-0.35px] rounded-[1000px] hover:bg-[#485C11]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
      >
        {isResending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : resendCountdown > 0 ? (
          `Resend in ${resendCountdown}s`
        ) : (
          'Resend verification email'
        )}
      </button>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#E9E9E9]"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 font-sans text-[14px] text-[#6F6F6F]">
            Need help?
          </span>
        </div>
      </div>

      {/* Action Links */}
      <div className="space-y-3">
        <Link
          href="/signup"
          className="w-full flex items-center justify-center px-6 py-3.5 bg-[#DFECC6] text-black font-sans font-bold text-[14px] tracking-[-0.35px] rounded-[1000px] hover:bg-[#DFECC6]/80 transition-colors"
        >
          Try a different email
        </Link>

        <Link
          href="/login"
          className="w-full flex items-center justify-center px-6 py-3 text-[#485C11] font-sans font-medium text-[14px] hover:underline transition-colors"
        >
          Already verified? Sign in
        </Link>
      </div>
    </div>
  )
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={
      <div className="w-full flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#485C11] border-r-transparent mb-4"></div>
          <p className="text-slate-600 font-sans">Loading...</p>
        </div>
      </div>
    }>
      <CheckEmailContent />
    </Suspense>
  )
}
