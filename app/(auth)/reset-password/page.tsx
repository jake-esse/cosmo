'use client'

import { useState } from 'react'
import Link from 'next/link'
import { resetPassword } from '../actions'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(event.currentTarget)

    try {
      const result = await resetPassword(formData)
      
      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        setSuccess(result.message || 'Password reset link sent! Check your email.')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      {/* Back Link */}
      <Link
        href="/login"
        className="inline-flex items-center font-sans text-[14px] text-[#6F6F6F] hover:text-[#485C11] transition-colors mb-8"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to sign in
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-brand text-[36px] leading-[1.1] tracking-[-1.8px] text-black">
          Reset your password
        </h1>
        <p className="mt-3 font-sans text-[16px] leading-[1.4] text-[#6F6F6F]">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>
      
      {!success ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block font-sans font-medium text-[14px] text-black mb-2">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={isLoading}
              autoComplete="email"
              className="w-full px-4 py-3 font-sans text-[15px] border border-[#E9E9E9] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#485C11] focus:border-transparent placeholder:text-[#929292] disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <p className="mt-2 font-sans text-[12px] text-[#6F6F6F]">
              We&apos;ll send a password reset link to this email
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-[12px] bg-red-50 border border-red-200 p-4">
              <p className="font-sans text-[14px] text-red-600">
                {error}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center px-6 py-3.5 bg-[#485C11] text-white font-sans font-bold text-[14px] tracking-[-0.35px] rounded-[1000px] hover:bg-[#485C11]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending reset link...
              </>
            ) : (
              'Send reset link'
            )}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E9E9E9]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 font-sans text-[14px] text-[#6F6F6F]">
                Remember your password?
              </span>
            </div>
          </div>

          {/* Sign In Link */}
          <Link
            href="/login"
            className="w-full flex items-center justify-center px-6 py-3.5 bg-[#DFECC6] text-black font-sans font-bold text-[14px] tracking-[-0.35px] rounded-[1000px] hover:bg-[#DFECC6]/80 transition-colors"
          >
            Return to sign in
          </Link>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Success State */}
          <div className="rounded-[12px] bg-[#DFECC6] border border-[#485C11]/20 p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-[#485C11] flex items-center justify-center">
                <Mail className="h-6 w-6 text-white" />
              </div>
            </div>
            <h2 className="font-brand text-[24px] tracking-[-1.2px] text-[#485C11] mb-2">
              Check your email
            </h2>
            <p className="font-sans text-[14px] text-[#485C11]/80">
              {success}
            </p>
            <p className="font-sans text-[12px] text-[#6F6F6F] mt-3">
              Didn&apos;t receive the email? Check your spam folder or try again.
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/login"
              className="w-full flex items-center justify-center px-6 py-3.5 bg-[#485C11] text-white font-sans font-bold text-[14px] tracking-[-0.35px] rounded-[1000px] hover:bg-[#485C11]/90 transition-colors"
            >
              Return to sign in
            </Link>
            
            <button
              onClick={() => {
                setSuccess(null)
                setError(null)
              }}
              className="w-full flex items-center justify-center px-6 py-3.5 bg-white border border-[#E9E9E9] text-black font-sans font-bold text-[14px] tracking-[-0.35px] rounded-[1000px] hover:bg-gray-50 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
