'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from '../actions'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    // Check for email confirmation success
    if (searchParams.get('confirmed') === 'true') {
      setSuccessMessage('Email confirmed successfully! You can now sign in.')
    }
    // Check for errors
    const errorParam = searchParams.get('error')
    if (errorParam === 'verification_failed') {
      setError('Email verification failed. Please try again or contact support.')
    }
  }, [searchParams])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)

    try {
      const result = await signIn(formData)
      
      if (result?.error) {
        setError(result.error)
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-brand text-[36px] leading-[1.1] tracking-[-1.8px] text-black">
          Welcome back
        </h1>
        <p className="mt-3 font-sans text-[16px] leading-[1.4] text-[#6F6F6F]">
          Sign in to continue earning equity rewards
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 rounded-[12px] bg-[#DFECC6] border border-[#485C11]/20 p-4">
          <p className="font-sans text-[14px] text-[#485C11]">
            {successMessage}
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block font-sans font-medium text-[14px] text-black mb-2">
            Email
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
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block font-sans font-medium text-[14px] text-black">
              Password
            </label>
            <Link
              href="/reset-password"
              className="font-sans text-[14px] text-[#485C11] hover:text-[#485C11]/80 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            required
            disabled={isLoading}
            autoComplete="current-password"
            className="w-full px-4 py-3 font-sans text-[15px] border border-[#E9E9E9] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#485C11] focus:border-transparent placeholder:text-[#929292] disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex items-center">
          <input
            id="remember"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
            className="w-4 h-4 text-[#485C11] border-[#E9E9E9] rounded focus:ring-[#485C11] focus:ring-2"
          />
          <label
            htmlFor="remember"
            className="ml-2 font-sans text-[14px] text-[#6F6F6F] cursor-pointer select-none"
          >
            Remember me for 30 days
          </label>
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
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E9E9E9]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 font-sans text-[14px] text-[#6F6F6F]">
              New to Ampel?
            </span>
          </div>
        </div>

        {/* Sign Up Link */}
        <Link
          href="/signup"
          className="w-full flex items-center justify-center px-6 py-3.5 bg-[#DFECC6] text-black font-sans font-bold text-[14px] tracking-[-0.35px] rounded-[1000px] hover:bg-[#DFECC6]/80 transition-colors"
        >
          Create an account
        </Link>
      </form>

      {/* Footer Links */}
      <div className="mt-8 pt-8 border-t border-[#E9E9E9]">
        <p className="font-sans text-[12px] text-[#6F6F6F] text-center">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-[#485C11] hover:underline">
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-[#485C11] hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}
