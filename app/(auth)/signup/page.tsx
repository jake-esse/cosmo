'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signUp } from '../actions'
import { Loader2, Sparkles } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!termsAccepted) {
      setError('Please accept the terms and conditions')
      setIsLoading(false)
      return
    }

    const formData = new FormData(event.currentTarget)
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    // Combine first and last name for the fullName field
    formData.set('fullName', `${firstName} ${lastName}`)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      const result = await signUp(formData)

      // Only handle errors - success redirects to /kyc/start automatically
      if (result?.error) {
        setError(result.error)
        setIsLoading(false)
      }
      // If no error, the server action will redirect to /kyc/start
    } catch (error: unknown) {
      // Check if this is a redirect (expected behavior from Next.js server actions)
      if (error && typeof error === 'object' && 'digest' in error) {
        const digest = (error as { digest?: string }).digest
        if (digest?.includes('NEXT_REDIRECT')) {
          // This is expected - the redirect is happening
          return
        }
      }
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-brand text-[36px] leading-[1.1] tracking-[-1.8px] text-black">
          Create your account
        </h1>
        <p className="mt-3 font-sans text-[16px] leading-[1.4] text-[#6F6F6F]">
          Join thousands earning equity in AI applications
        </p>
      </div>
      
      {/* Equity Bonus Banner */}
      <div className="rounded-[12px] bg-[#DFECC6] border border-[#485C11]/20 p-4 mb-6">
        <div className="flex items-center">
          <Sparkles className="h-5 w-5 text-[#485C11] mr-2" />
          <p className="font-sans font-bold text-[14px] text-[#485C11]">
            Earn 100 shares after completing verification!
          </p>
        </div>
        <p className="font-sans text-[12px] text-[#485C11]/80 mt-1 ml-7">
          Plus 25 bonus shares if you were referred by a friend
        </p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block font-sans font-medium text-[14px] text-black mb-2">
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="John"
              required
              disabled={isLoading}
              className="w-full px-4 py-3 font-sans text-[15px] text-black border border-[#E9E9E9] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#485C11] focus:border-transparent placeholder:text-[#929292] disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>
          
          <div>
            <label htmlFor="lastName" className="block font-sans font-medium text-[14px] text-black mb-2">
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Doe"
              required
              disabled={isLoading}
              className="w-full px-4 py-3 font-sans text-[15px] text-black border border-[#E9E9E9] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#485C11] focus:border-transparent placeholder:text-[#929292] disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
        
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
            className="w-full px-4 py-3 font-sans text-[15px] text-black border border-[#E9E9E9] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#485C11] focus:border-transparent placeholder:text-[#929292] disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="password" className="block font-sans font-medium text-[14px] text-black mb-2">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Create a secure password"
            required
            disabled={isLoading}
            minLength={8}
            className="w-full px-4 py-3 font-sans text-[15px] text-black border border-[#E9E9E9] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#485C11] focus:border-transparent placeholder:text-[#929292] disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          <p className="mt-1 font-sans text-[12px] text-[#6F6F6F]">
            Must be at least 8 characters
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block font-sans font-medium text-[14px] text-black mb-2">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            required
            disabled={isLoading}
            minLength={8}
            className="w-full px-4 py-3 font-sans text-[15px] text-black border border-[#E9E9E9] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#485C11] focus:border-transparent placeholder:text-[#929292] disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="referralCode" className="block font-sans font-medium text-[14px] text-black mb-2">
            Referral code
            <span className="font-normal text-[#6F6F6F]"> (optional)</span>
          </label>
          <input
            id="referralCode"
            name="referralCode"
            type="text"
            placeholder="Enter referral code"
            disabled={isLoading}
            className="w-full px-4 py-3 font-sans text-[15px] text-black border border-[#E9E9E9] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#485C11] focus:border-transparent placeholder:text-[#929292] disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          <p className="mt-1 font-sans text-[12px] text-[#6F6F6F]">
            Both you and your referrer earn bonus shares!
          </p>
        </div>

        <div className="flex items-start">
          <input
            id="terms"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            disabled={isLoading}
            className="w-4 h-4 mt-0.5 text-[#485C11] border-[#E9E9E9] rounded focus:ring-[#485C11] focus:ring-2"
          />
          <label
            htmlFor="terms"
            className="ml-2 font-sans text-[14px] text-[#6F6F6F] cursor-pointer select-none"
          >
            I agree to Ampel&apos;s{' '}
            <Link href="/terms" className="text-[#485C11] hover:underline">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-[#485C11] hover:underline">
              Privacy Policy
            </Link>
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
          disabled={isLoading || !termsAccepted}
          className="w-full flex items-center justify-center px-6 py-3.5 bg-[#485C11] text-white font-sans font-bold text-[14px] tracking-[-0.35px] rounded-[1000px] hover:bg-[#485C11]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E9E9E9]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 font-sans text-[14px] text-[#6F6F6F]">
              Already have an account?
            </span>
          </div>
        </div>

        {/* Sign In Link */}
        <Link
          href="/login"
          className="w-full flex items-center justify-center px-6 py-3.5 bg-[#DFECC6] text-black font-sans font-bold text-[14px] tracking-[-0.35px] rounded-[1000px] hover:bg-[#DFECC6]/80 transition-colors"
        >
          Sign in instead
        </Link>
      </form>
    </div>
  )
}
