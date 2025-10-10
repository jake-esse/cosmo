/**
 * KYC Success Page
 * Displayed after successful identity verification
 *
 * Note: Converted to client component for static export compatibility
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import KYCSuccessContent from './KYCSuccessContent'

export default function KYCSuccessPage() {
  const router = useRouter()
  const [isVerifying, setIsVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function verifyKYCStatus() {
      try {
        // Verify user session
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          // No valid session - redirect to login
          router.push('/login?redirect=/kyc/start&error=session_lost')
          return
        }

        // Verify KYC was actually completed by checking for completed session
        const { data: completedSession } = await supabase
          .from('kyc_sessions')
          .select('id, status, completed_at, inquiry_id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false, nullsLast: true })
          .limit(1)
          .maybeSingle()

        if (!completedSession) {
          console.warn('[KYC Success] No completed session found:', {
            userId: user.id,
            timestamp: new Date().toISOString(),
          })
          // KYC not actually completed - redirect back to start
          router.push('/kyc/start?error=verification_incomplete')
          return
        }

        console.log('[KYC Success] Verification check passed:', {
          userId: user.id,
          sessionId: completedSession.id,
          completedAt: completedSession.completed_at,
          inquiryId: completedSession.inquiry_id,
          timestamp: new Date().toISOString(),
        })

        // All checks passed
        setIsVerifying(false)
      } catch (err) {
        console.error('[KYC Success] Verification error:', err)
        setError('Failed to verify KYC status')
        setIsVerifying(false)
      }
    }

    verifyKYCStatus()
  }, [router])

  if (isVerifying) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#485C11] border-r-transparent mb-4"></div>
          <p className="text-slate-600 font-sans">Verifying your identity...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50">
        <div className="text-center">
          <p className="text-red-600 font-sans mb-4">{error}</p>
          <button
            onClick={() => router.push('/kyc/start')}
            className="px-4 py-2 bg-[#2A341D] text-white rounded-lg hover:bg-[#1F2816]"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // All checks passed - show success page (client component handles redirect)
  return <KYCSuccessContent />
}
