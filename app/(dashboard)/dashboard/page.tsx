'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageLayout } from '@/components/layout/PageLayout'
import CopyButton from '@/components/CopyButton'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [balance, setBalance] = useState<any>(null)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)
        setError(null)

        const supabase = createClient()

        // Check auth
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          router.push('/login')
          return
        }

        // FAILSAFE: Check for and complete any pending referrals when dashboard loads
        try {
          const { data: referralResult, error: referralError } = await supabase.rpc(
            'complete_pending_referral_for_user',
            { p_user_id: user.id }
          )

          if (referralResult?.success) {
            console.log('[DASHBOARD_REFERRAL_CHECK] Completed pending referral:', referralResult)
          } else if (referralResult?.reason && !referralResult.reason.includes('No pending referral')) {
            console.log('[DASHBOARD_REFERRAL_CHECK] Referral check result:', referralResult)
          }

          if (referralError) {
            console.warn('[DASHBOARD_REFERRAL_CHECK] RPC error:', referralError?.message || referralError)
          }
        } catch (err) {
          // Don't fail dashboard load if referral check fails
          console.error('[DASHBOARD_REFERRAL_CHECK] Exception during referral check:', err)
        }

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('[DASHBOARD] Profile fetch error:', profileError)
          throw new Error('Failed to load profile')
        }

        // Fetch balance using same RPC as Server Action
        const { data: balanceData, error: balanceError } = await supabase.rpc('get_user_balance', {
          p_user_id: user.id
        })

        if (balanceError) {
          console.error('[DASHBOARD] Balance fetch error:', balanceError)
          throw new Error('Failed to load balance')
        }

        setProfile(profileData)
        setBalance(balanceData)
        setLoading(false)
      } catch (err) {
        console.error('[DASHBOARD] Load error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [router])

  const formatNumber = (num: number | string | null) => {
    if (num === null || num === undefined) return '0'
    return parseFloat(num.toString()).toLocaleString()
  }

  // Loading state
  if (loading) {
    return (
      <PageLayout pageName="Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#485C11] border-r-transparent mb-4"></div>
            <p className="text-slate-600 font-sans">Loading dashboard...</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <PageLayout pageName="Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 font-sans mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#2A341D] text-white rounded-lg hover:bg-[#1F2816]"
            >
              Try Again
            </button>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout pageName="Dashboard">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-heading-lg text-slate-900">
            Welcome back, {profile?.display_name || profile?.username || 'User'}
          </h1>
          <p className="text-body-lg text-slate-600 mt-1">
            Here&apos;s an overview of your account
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-[30px] border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-label-lg text-slate-600">Current Balance</p>
            </div>
            <p className="text-heading-lg text-slate-900">
              {formatNumber(balance?.total_balance)}
            </p>
            <p className="text-label-sm text-slate-500 mt-1">equity points</p>
          </div>
          
          <div className="bg-white p-6 rounded-[30px] border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-label-lg text-slate-600">Total Earned</p>
            </div>
            <p className="text-heading-lg text-slate-900">
              {formatNumber(balance?.total_earned)}
            </p>
            <p className="text-label-sm text-slate-500 mt-1">lifetime points</p>
          </div>
          
          <div className="bg-white p-6 rounded-[30px] border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-label-lg text-slate-600">Referral Code</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-mono font-semibold text-slate-900">
                {profile?.referral_code || 'N/A'}
              </p>
              <CopyButton text={profile?.referral_code || ''} />
            </div>
            <p className="text-label-sm text-slate-500 mt-1">Share to earn 50 points</p>
          </div>
          
          <div className="bg-white p-6 rounded-[30px] border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-label-lg text-slate-600">Transactions</p>
            </div>
            <p className="text-heading-lg text-slate-900">
              {formatNumber(balance?.transaction_count)}
            </p>
            <p className="text-label-sm text-slate-500 mt-1">total completed</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-heading-sm text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-[30px] border border-slate-200">
              <h3 className="text-label-lg text-slate-900 mb-2">Start a Chat</h3>
              <p className="text-body-md text-slate-600 mb-4">
                Chat with AI assistants powered by Claude
              </p>
              <button className="text-label-lg text-slate-700 hover:text-slate-900">
                Coming soon →
              </button>
            </div>
            <div className="bg-white p-6 rounded-[30px] border border-slate-200">
              <h3 className="text-label-lg text-slate-900 mb-2">Browse Apps</h3>
              <p className="text-body-md text-slate-600 mb-4">
                Discover AI applications in the marketplace
              </p>
              <button className="text-label-lg text-slate-700 hover:text-slate-900">
                Coming soon →
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-heading-sm text-slate-900 mb-4">Recent Activity</h2>
          <div className="bg-white rounded-[30px] border border-slate-200">
            <div className="p-6 text-center text-slate-600">
              <p className="text-body-md">No recent activity</p>
              <p className="text-label-sm mt-1 text-slate-500">Your transactions will appear here</p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}