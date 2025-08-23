'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Sign in to Cosmo</h2>
        <p className="mt-2 text-sm text-gray-600">
          Welcome back! Please enter your details
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            disabled={isLoading}
            autoComplete="email"
            className="w-full"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</Label>
            <Link
              href="/reset-password"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Forgot?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            disabled={isLoading}
            autoComplete="current-password"
            className="w-full"
          />
        </div>

        <div className="flex items-center">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            disabled={isLoading}
          />
          <Label
            htmlFor="remember"
            className="ml-2 text-sm text-gray-600 cursor-pointer"
          >
            Remember me
          </Label>
        </div>

        {successMessage && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-600">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>

        <p className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link
            href="/signup"
            className="text-blue-600 hover:text-blue-700"
          >
            Sign up
          </Link>
        </p>
      </form>
    </div>
  )
}