"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import { Users, Clock, Award, Share2, Copy, CheckCircle2, Mail, Sparkles } from 'lucide-react'
import { PageLayout } from "@/components/layout/PageLayout"

interface ReferralStats {
  totalReferred: number
  completedReferrals: number
  pendingReferrals: number
  totalEarned: number
  referralCode: string
  userId: string
}

interface ReferralHistory {
  id: string
  status: string
  created_at: string
  completed_at: string | null
  referred_id: string
  referred: {
    username: string | null
    display_name: string | null
    created_at: string
  }
}

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [referralHistory, setReferralHistory] = useState<ReferralHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        redirect('/login')
      }

      // Get user's referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single()

      // Get referral statistics
      const { data: referrals } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)

      const completedReferrals = referrals?.filter(r => r.status === 'completed').length || 0
      const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0

      // Get total earned from referral transactions
      const { data: transactions } = await supabase
        .from('equity_transactions')
        .select('amount, description')
        .eq('user_id', user.id)
        .or('description.ilike.%referral%,description.ilike.%invite%,description.ilike.%friend%')

      const totalEarned = transactions?.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0

      setStats({
        totalReferred: referrals?.length || 0,
        completedReferrals,
        pendingReferrals,
        totalEarned,
        referralCode: profile?.referral_code || '',
        userId: user.id
      })

      // Get referral history
      const { data: history } = await supabase
        .from('referrals')
        .select(`
          id,
          status,
          created_at,
          completed_at,
          referred_id,
          referred:profiles!referrals_referred_id_fkey(
            username,
            display_name,
            created_at
          )
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setReferralHistory(history || [])
      setLoading(false)
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <PageLayout pageName="Referral Program">
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      </PageLayout>
    )
  }

  if (!stats) return null

  const referralUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ampel.ai'}/signup?ref=${stats.referralCode}`

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(stats.referralCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

  const handleShareEmail = () => {
    const subject = 'Join me on Ampel - The AI App Store'
    const body = `Hi there!

I'm using Ampel, the first app store where users earn equity in the AI apps they use.

Join using my referral code and we'll both earn equity points:

Referral Code: ${stats.referralCode}
Sign up here: ${referralUrl}

See you there!`

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoUrl)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <PageLayout pageName="Referral Program">
      <div className="py-8 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-brand text-4xl text-gray-900 mb-2">
              Share Ampel, Earn Shares
            </h1>
            <p className="text-lg text-gray-600">
              Earn 50 shares for each friend who joins Ampel
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-[30px] border border-[#B0C4C9]/40 p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-[#485C11]" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {stats.totalReferred}
              </p>
              <p className="text-sm text-gray-600">Total Referred</p>
            </div>

            <div className="bg-white rounded-[30px] border border-[#B0C4C9]/40 p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="h-5 w-5 text-[#485C11]" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {stats.completedReferrals}
              </p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>

            <div className="bg-white rounded-[30px] border border-[#B0C4C9]/40 p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {stats.pendingReferrals}
              </p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>

            <div className="bg-white rounded-[30px] border border-[#B0C4C9]/40 p-6">
              <div className="flex items-center justify-between mb-2">
                <Sparkles className="h-5 w-5 text-[#485C11]" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {stats.totalEarned}
              </p>
              <p className="text-sm text-gray-600">Shares Earned</p>
            </div>
          </div>

          {/* Share Card */}
          <div className="bg-[#DFECC6]/20 rounded-[30px] border border-[#485C11]/20 p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-brand text-2xl text-gray-900">
                Share & Earn
              </h2>
              <Share2 className="h-6 w-6 text-[#485C11]" />
            </div>

            <div className="space-y-6">
              {/* Referral Code */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Your Referral Code
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1 bg-white rounded-2xl border border-[#B0C4C9]/40 px-6 py-4">
                    <span className="font-mono text-xl font-bold text-gray-900">
                      {stats.referralCode}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="px-6 py-4 bg-[#485C11] text-white rounded-2xl font-medium hover:bg-[#3a4a0e] transition-all flex items-center justify-center gap-2"
                  >
                    {copiedCode ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-5 w-5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Referral URL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Your Referral Link
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1 bg-white rounded-2xl border border-[#B0C4C9]/40 px-6 py-4 overflow-hidden">
                    <span className="text-sm text-gray-600 truncate block">
                      {referralUrl}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyUrl}
                    className="px-6 py-4 bg-white border border-[#B0C4C9]/40 text-gray-900 rounded-2xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    {copiedUrl ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-[#485C11]" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-5 w-5" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Share Button */}
              <button
                onClick={handleShareEmail}
                className="w-full px-6 py-4 bg-white border border-[#B0C4C9]/40 text-gray-900 rounded-2xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <Mail className="h-5 w-5" />
                Share via Email
              </button>

              {/* Reward Info */}
              <div className="bg-white rounded-2xl border border-[#B0C4C9]/40 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#DFECC6] rounded-full flex items-center justify-center">
                    <Award className="h-6 w-6 text-[#485C11]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">
                      Earn 50 shares per referral
                    </p>
                    <p className="text-sm text-gray-600">
                      Your friends get 25 bonus shares when they sign up with your code and complete their education
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-white rounded-[30px] border border-[#B0C4C9]/40 p-8 mb-8">
            <h2 className="font-brand text-2xl text-gray-900 mb-6">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-[#DFECC6] rounded-full flex items-center justify-center">
                  <span className="font-bold text-[#485C11]">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Share Your Code</h3>
                  <p className="text-sm text-gray-600">
                    Send your unique referral code or link to friends
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-[#DFECC6] rounded-full flex items-center justify-center">
                  <span className="font-bold text-[#485C11]">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Friends Sign Up</h3>
                  <p className="text-sm text-gray-600">
                    They join Ampel using your referral code
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-[#DFECC6] rounded-full flex items-center justify-center">
                  <span className="font-bold text-[#485C11]">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Earn Shares</h3>
                  <p className="text-sm text-gray-600">
                    Get 50 shares when they complete onboarding
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Referral History */}
          {referralHistory.length > 0 && (
            <div className="bg-white rounded-[30px] border border-[#B0C4C9]/40 p-8 mb-8">
              <h2 className="font-brand text-2xl text-gray-900 mb-6">
                Recent Referrals
              </h2>

              <div className="space-y-3">
                {referralHistory.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between py-4 px-4 bg-gray-50 rounded-2xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#DFECC6] rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-[#485C11]">
                          {referral.referred?.display_name?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {referral.referred?.display_name || 'Anonymous User'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDate(referral.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {referral.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#DFECC6] text-[#485C11] rounded-full text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                          <Clock className="w-4 h-4" />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Terms */}
          <div className="p-6 bg-gray-50 rounded-2xl">
            <p className="text-xs text-gray-600">
              <strong>Referral Terms:</strong> Referral rewards are awarded when invited users complete their educational requirements and accept shares.
              Both you and your friend will receive equity shares. Maximum 50 referrals per month.
              Ampel reserves the right to modify or cancel rewards for suspicious activity.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}