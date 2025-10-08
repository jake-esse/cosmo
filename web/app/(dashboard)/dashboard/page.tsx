import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserBalance } from '@/app/(auth)/actions'
import { PageLayout } from '@/components/layout/PageLayout'
import CopyButton from '@/components/CopyButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const balance = await getUserBalance(user.id)
  
  const formatNumber = (num: number | string | null) => {
    if (num === null || num === undefined) return '0'
    return parseFloat(num.toString()).toLocaleString()
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