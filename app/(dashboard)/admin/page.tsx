import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, Users, Activity, Database, Settings, Wrench } from 'lucide-react'
import ReferralTools from './components/ReferralTools'

async function getAdminStats() {
  const supabase = await createClient()
  
  const [
    { count: totalUsers },
    { count: totalReferrals },
    { count: pendingReferrals },
    { count: totalTransactions }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('referrals').select('*', { count: 'exact', head: true }),
    supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('equity_transactions').select('*', { count: 'exact', head: true })
  ])
  
  return {
    totalUsers: totalUsers || 0,
    totalReferrals: totalReferrals || 0,
    pendingReferrals: pendingReferrals || 0,
    totalTransactions: totalTransactions || 0
  }
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  const stats = await getAdminStats()
  
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="h-6 w-6 text-red-600" />
          Admin Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          System administration and monitoring tools
        </p>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Users</p>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {stats.totalUsers.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Referrals</p>
            <Activity className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {stats.totalReferrals.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Pending Referrals</p>
            <Activity className="h-4 w-4 text-orange-400" />
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {stats.pendingReferrals.toLocaleString()}
          </p>
          {stats.pendingReferrals > 0 && (
            <p className="text-xs text-orange-600 mt-1">Needs attention</p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Transactions</p>
            <Database className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {stats.totalTransactions.toLocaleString()}
          </p>
        </div>
      </div>
      
      {/* Referral Tools - Prominent placement */}
      <div className="mb-8">
        <ReferralTools />
      </div>
      
      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link 
          href="/admin/referrals"
          className="bg-white p-6 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Activity className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Referral Testing</h3>
              <p className="text-sm text-gray-600 mt-1">
                Test referral flows and monitor security
              </p>
            </div>
          </div>
        </Link>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200 opacity-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Settings className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-500">System Settings</h3>
              <p className="text-sm text-gray-400 mt-1">
                Coming soon
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}