'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const success = searchParams.get('success') === 'true'

  if (error) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <XCircle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-center">Verification Failed</CardTitle>
          <CardDescription className="text-center">
            {error === 'expired' 
              ? 'This verification link has expired. Please request a new one.'
              : 'There was an error verifying your email. Please try again.'}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Link href="/login">
            <Button>Back to Login</Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-center">Email Verified!</CardTitle>
          <CardDescription className="text-center">
            Your email has been successfully verified. You&apos;ve been awarded 100 equity points!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 p-4 border border-violet-200">
            <p className="text-sm font-medium text-violet-900 text-center mb-1">
              Welcome Bonus Activated
            </p>
            <p className="text-2xl font-bold text-violet-700 text-center">
              +100 Points
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/dashboard">
            <Button className="w-full">Go to Dashboard</Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <CardTitle className="text-center">Verifying Email</CardTitle>
        <CardDescription className="text-center">
          Please wait while we verify your email address...
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <Card className="w-full max-w-md">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}