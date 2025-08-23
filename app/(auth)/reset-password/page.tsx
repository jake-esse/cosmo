'use client'

import { useState } from 'react'
import Link from 'next/link'
import { resetPassword } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft } from 'lucide-react'

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
        setSuccess(result.message)
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
        <h2 className="text-2xl font-semibold text-gray-900">Reset password</h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter your email to receive a password reset link
        </p>
      </div>
      
      {!success ? (
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
                Sending reset link...
              </>
            ) : (
              'Send reset link'
            )}
          </Button>

          <Link
            href="/login"
            className="flex items-center justify-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to sign in
          </Link>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="rounded-md bg-green-50 border border-green-200 p-4 text-center">
            <p className="text-sm font-medium text-green-900 mb-1">
              Check your email
            </p>
            <p className="text-sm text-green-700">
              {success}
            </p>
          </div>
          <Link
            href="/login"
            className="block"
          >
            <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}