'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signUp } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Sparkles } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    if (!termsAccepted) {
      setError('Please accept the terms and conditions')
      setIsLoading(false)
      return
    }

    const formData = new FormData(event.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      const result = await signUp(formData)
      
      if (result?.error) {
        setError(result.error)
      } else if (result?.requiresEmailConfirmation) {
        setSuccess(result.message || 'Please check your email to confirm your account')
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
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Create an account</h2>
        <p className="mt-2 text-sm text-gray-600">
          Get started with your free account
        </p>
      </div>
      
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-6">
        <div className="flex items-center">
          <Sparkles className="h-5 w-5 text-blue-600 mr-2" />
          <p className="text-sm font-medium text-blue-900">
            Earn 100 equity points instantly upon signup!
          </p>
        </div>
        <p className="text-xs text-blue-700 mt-1">
          Start earning equity in the apps you use from day one
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="John Doe"
            required
            disabled={isLoading}
            className="w-full"
          />
        </div>
        
        <div>
          <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            disabled={isLoading}
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            disabled={isLoading}
            minLength={6}
            className="w-full"
          />
          <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            disabled={isLoading}
            minLength={6}
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 mb-1">
            Referral Code
            <span className="text-gray-500 font-normal"> (Optional)</span>
          </Label>
          <Input
            id="referralCode"
            name="referralCode"
            type="text"
            placeholder="Enter code"
            disabled={isLoading}
            className="w-full"
          />
          <p className="mt-1 text-xs text-gray-500">Both you and your referrer earn bonus points!</p>
        </div>

        <div className="flex items-start">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
            disabled={isLoading}
            className="mt-0.5"
          />
          <Label
            htmlFor="terms"
            className="ml-2 text-sm text-gray-600 cursor-pointer"
          >
            I agree to the{' '}
            <Link href="/terms" className="text-blue-600 hover:text-blue-700 underline">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
              Privacy Policy
            </Link>
          </Label>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-600">
            {success}
          </div>
        )}


        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isLoading || !termsAccepted}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-700"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}