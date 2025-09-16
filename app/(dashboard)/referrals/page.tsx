import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, TrendingUp, Clock, Award, Share2, ChevronRight } from 'lucide-react'
import ReferralShareCard from '@/components/ReferralShareCard'
import ReferralList from '@/components/ReferralList'
import Link from 'next/link'

interface ReferralStats {
  totalReferred: number
  completedReferrals: number
  pendingReferrals: number
  totalEarned: number
  referralCode: string
  userId: string
}

async function getReferralStats(userId: string): Promise<ReferralStats> {
  const supabase = await createClient()
  
  // Get user's referral code
  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .single()
  
  // Get referral statistics
  const { data: referrals } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', userId)
  
  const completedReferrals = referrals?.filter(r => r.status === 'completed').length || 0
  const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0
  
  // Get total earned from referral transactions
  // Since metadata might be empty, look for transactions with referral-related descriptions
  const { data: transactions } = await supabase
    .from('equity_transactions')
    .select('amount, description')
    .eq('user_id', userId)
    .or('description.ilike.%referral%,description.ilike.%invite%,description.ilike.%friend%')
  
  const totalEarned = transactions?.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0
  
  return {
    totalReferred: referrals?.length || 0,
    completedReferrals,
    pendingReferrals,
    totalEarned,
    referralCode: profile?.referral_code || '',
    userId
  }
}

async function getReferralHistory(userId: string) {
  const supabase = await createClient()
  
  const { data: referrals } = await supabase
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
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)
  
  return referrals || []
}

export default async function ReferralsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  const stats = await getReferralStats(user.id)
  const referralHistory = await getReferralHistory(user.id)
  
  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }
  
  const referralUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cosmo.ai'}/signup?ref=${stats.referralCode}`
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Link 
            href="/dashboard" 
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-900">Referrals</span>
        </div>
        
        <h1 className="text-2xl font-semibold text-gray-900">
          Referral Program
        </h1>
        <p className="text-gray-600 mt-1">
          Earn 50 points for each friend who joins Cosmo
        </p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        <div className="bg-white p-4 md:p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Referred</p>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {formatNumber(stats.totalReferred)}
          </p>
          <p className="text-xs text-gray-500 mt-1">friends invited</p>
        </div>
        
        <div className="bg-white p-4 md:p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <Award className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {formatNumber(stats.completedReferrals)}
          </p>
          <p className="text-xs text-gray-500 mt-1">verified signups</p>
        </div>
        
        <div className="bg-white p-4 md:p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <Clock className="h-4 w-4 text-yellow-500" />
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {formatNumber(stats.pendingReferrals)}
          </p>
          <p className="text-xs text-gray-500 mt-1">awaiting verification</p>
        </div>
        
        <div className="bg-white p-4 md:p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Points Earned</p>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {formatNumber(stats.totalEarned)}
          </p>
          <p className="text-xs text-gray-500 mt-1">from referrals</p>
        </div>
      </div>
      
      {/* Share Card */}
      <ReferralShareCard 
        referralCode={stats.referralCode}
        referralUrl={referralUrl}
      />
      
      {/* How It Works */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-blue-600" />
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-600">1</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Share Your Code</h3>
              <p className="text-sm text-gray-600">
                Send your unique referral code or link to friends
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-600">2</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Friends Sign Up</h3>
              <p className="text-sm text-gray-600">
                They join Cosmo using your referral code
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-600">3</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Earn Points</h3>
              <p className="text-sm text-gray-600">
                Get 50 points when they verify their email
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Referral History */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Referrals
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Track your referral activity and earnings
          </p>
        </div>
        
        <ReferralList referrals={referralHistory} />
      </div>
      
      {/* Terms */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Referral Terms:</strong> Referral rewards are awarded when invited users verify their email address. 
          Both you and your friend will receive equity points. Maximum 50 referrals per month. 
          Cosmo reserves the right to modify or cancel rewards for suspicious activity.
        </p>
      </div>
    </div>
  )
}