"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { CheckCircle2, ArrowRight, Sparkles, TrendingUp } from "lucide-react"

export default function CompletePage() {
  const [shareCount, setShareCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchShareCount() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Get the user's total equity balance from the last transaction
        const { data, error } = await supabase
          .from('equity_transactions')
          .select('balance_after')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!error && data) {
          setShareCount(data.balance_after || 0)
        }
      }
      setLoading(false)
    }

    fetchShareCount()
  }, [])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success Card */}
        <div className="bg-white rounded-[30px] border border-[#B0C4C9]/40 p-8 text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-[#DFECC6] flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-[#485C11]" />
            </div>
          </div>

          {/* Welcome Message */}
          <h1 className="font-brand text-3xl text-gray-900 mb-3">
            Welcome to Ampel!
          </h1>

          {shareCount > 0 ? (
            <>
              <p className="text-lg text-gray-600 mb-8">
                Congratulations! You've received your first equity shares.
              </p>

              {/* Share Details */}
              <div className="bg-[#DFECC6]/20 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-[#485C11]" />
                  <span className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : shareCount.toLocaleString()} shares
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-[#485C11]/10">
                    <span className="text-gray-600">Type</span>
                    <span className="font-medium text-gray-900">Non-voting Common Stock</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#485C11]/10">
                    <span className="text-gray-600">Ownership %</span>
                    <span className="font-medium text-gray-900">
                      {loading ? '...' : `${(shareCount * 0.00001).toFixed(5)}%`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600">Status</span>
                    <span className="font-medium text-[#485C11] flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Steps Info */}
              <div className="text-left bg-gray-50 rounded-2xl p-4 mb-8">
                <p className="text-sm text-gray-600 mb-2 font-semibold">How to earn more shares:</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-[#485C11]">•</span>
                    <span>Refer friends (+50 shares per referral)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#485C11]">•</span>
                    <span>Use Ampel daily</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#485C11]">•</span>
                    <span>Subscribe to premium plans</span>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <p className="text-lg text-gray-600 mb-8">
              Your educational requirements have been completed.
            </p>
          )}

          {/* CTA Button */}
          <Link href="/chat">
            <button className="w-full px-6 py-4 bg-[#485C11] text-white rounded-2xl font-medium hover:bg-[#3a4a0e] transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
              Start Using Ampel
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>

          {/* View Details Link */}
          {shareCount > 0 && (
            <Link href="/shares" className="inline-block mt-4 text-sm text-gray-600 hover:text-[#485C11] transition-colors">
              View share details in your account →
            </Link>
          )}
        </div>

        {/* Legal Text */}
        <p className="text-xs text-gray-500 text-center mt-6 px-4">
          Shares are subject to transfer restrictions and may never have value.
          See full terms in your account settings.
        </p>
      </div>
    </div>
  )
}