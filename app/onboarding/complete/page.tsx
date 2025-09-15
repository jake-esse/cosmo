"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function CompletePage() {
  const [shareCount, setShareCount] = useState<number>(100)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchShareCount() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Get the user's total equity balance
        const { data, error } = await supabase
          .from('equity_transactions')
          .select('shares')
          .eq('user_id', user.id)
          
        if (!error && data) {
          const totalShares = data.reduce((sum, tx) => sum + (tx.shares || 0), 0)
          setShareCount(totalShares)
        }
      }
      setLoading(false)
    }

    fetchShareCount()
  }, [])

  const shareValue = (shareCount * 0.00001).toFixed(3)

  return (
    <div className="text-center space-y-6">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="space-y-2">
        <h1 className="font-brand text-3xl text-slate-900">Welcome to Ampel!</h1>
        <p className="text-xl text-slate-700">
          You&apos;ve earned {loading ? '...' : shareCount} shares!
        </p>
      </div>

      {/* Share Details Card */}
      <div className="card-section">
        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-600">Your shares</span>
            <span className="font-semibold text-slate-900">
              {loading ? '...' : shareCount}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-600">Current value</span>
            <span className="font-semibold text-slate-900">
              ${loading ? '...' : shareValue}
            </span>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <Link href="/chat">
        <button className="px-8 py-3 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-all">
          Have a Chat
        </button>
      </Link>
    </div>
  )
}