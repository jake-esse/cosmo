'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signUp } from '../actions'
import { Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SignUpPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isEmailFormExpanded, setIsEmailFormExpanded] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)
  const [referralCode, setReferralCode] = useState('')

  async function handleOAuthSignIn(provider: 'google' | 'apple') {
    setError(null)
    setOauthLoading(provider)

    // Store referral code in localStorage to preserve it through OAuth flow
    if (referralCode.trim()) {
      localStorage.setItem('ampel_referral_code', referralCode.trim())
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })

      if (error) {
        setError(`Failed to sign in with ${provider === 'google' ? 'Google' : 'Apple'}. Please try again.`)
        setOauthLoading(null)
      }
      // If successful, user will be redirected to OAuth provider
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setOauthLoading(null)
    }
  }

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

      // Only handle errors - success redirects to /check-email automatically
      if (result?.error) {
        setError(result.error)
        setIsLoading(false)
      }
      // If no error, the server action will redirect to /check-email
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

      {/* OAuth Buttons */}
      <div className="space-y-3 mb-6">
        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={() => handleOAuthSignIn('google')}
          disabled={oauthLoading !== null}
          className="w-full flex items-center justify-center px-6 py-3.5 bg-white border-2 border-[#E9E9E9] text-black font-sans font-medium text-[14px] tracking-[-0.35px] rounded-[12px] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {oauthLoading === 'google' ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Connecting to Google...
            </>
          ) : (
            <>
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Apple OAuth Button */}
        <button
          type="button"
          onClick={() => handleOAuthSignIn('apple')}
          disabled={oauthLoading !== null}
          className="w-full flex items-center justify-center px-6 py-3.5 bg-black text-white font-sans font-medium text-[14px] tracking-[-0.35px] rounded-[12px] hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {oauthLoading === 'apple' ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Connecting to Apple...
            </>
          ) : (
            <>
              <svg className="mr-3 h-5 w-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </>
          )}
        </button>
      </div>

      {/* Referral Code Input - Always Visible */}
      <div className="mb-6">
        <label htmlFor="referralCodeOAuth" className="block font-sans font-medium text-[14px] text-black mb-2">
          Referral code
          <span className="font-normal text-[#6F6F6F]"> (optional)</span>
        </label>
        <input
          id="referralCodeOAuth"
          type="text"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value)}
          placeholder="Enter referral code"
          disabled={oauthLoading !== null}
          className="w-full px-4 py-3 font-sans text-[15px] text-black border border-[#E9E9E9] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#485C11] focus:border-transparent placeholder:text-[#929292] disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
        <p className="mt-1 font-sans text-[12px] text-[#6F6F6F]">
          Both you and your referrer earn bonus shares!
        </p>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#E9E9E9]"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 font-sans text-[14px] text-[#6F6F6F]">
            or use email
          </span>
        </div>
      </div>

      {/* Collapsible Email Form Toggle */}
      <button
        type="button"
        onClick={() => setIsEmailFormExpanded(!isEmailFormExpanded)}
        disabled={oauthLoading !== null}
        className="w-full flex items-center justify-center px-6 py-3.5 bg-[#DFECC6] text-black font-sans font-medium text-[14px] tracking-[-0.35px] rounded-[12px] hover:bg-[#DFECC6]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
      >
        {isEmailFormExpanded ? (
          <>
            <ChevronUp className="mr-2 h-4 w-4" />
            Hide email signup
          </>
        ) : (
          <>
            <ChevronDown className="mr-2 h-4 w-4" />
            Sign up with email
          </>
        )}
      </button>

      {/* Error Message (for OAuth errors) */}
      {error && !isEmailFormExpanded && (
        <div className="rounded-[12px] bg-red-50 border border-red-200 p-4 mb-4">
          <p className="font-sans text-[14px] text-red-600">
            {error}
          </p>
        </div>
      )}

      {/* Email/Password Form - Collapsible */}
      {isEmailFormExpanded && (
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
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
      </form>
      )}

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
        className="w-full flex items-center justify-center px-6 py-3.5 bg-white border-2 border-[#E9E9E9] text-black font-sans font-medium text-[14px] tracking-[-0.35px] rounded-[12px] hover:bg-gray-50 transition-colors"
      >
        Sign in instead
      </Link>
    </div>
  )
}
