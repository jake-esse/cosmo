import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Shield, AlertTriangle, Activity, Users,
  Database
} from 'lucide-react'
import AdminTestPanel from '@/components/admin/AdminTestPanel'
import AdminSecurityConfig from '@/components/admin/AdminSecurityConfig'
import AdminReferralMonitor from '@/components/admin/AdminReferralMonitor'

async function getSystemHealth() {
  const supabase = await createClient()
  
  // Get system statistics
  const [
    { count: totalReferrals },
    { count: pendingReferrals },
    { count: completedReferrals },
    { count: suspiciousUsers },
    { count: blockedIps },
    { count: recentAttempts }
  ] = await Promise.all([
    supabase.from('referrals').select('*', { count: 'exact', head: true }),
    supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_suspicious', true),
    supabase.from('ip_security_tracking').select('*', { count: 'exact', head: true }).eq('is_blocked', true),
    supabase.from('referral_attempts').select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  ])
  
  return {
    totalReferrals: totalReferrals || 0,
    pendingReferrals: pendingReferrals || 0,
    completedReferrals: completedReferrals || 0,
    suspiciousUsers: suspiciousUsers || 0,
    blockedIps: blockedIps || 0,
    recentAttempts: recentAttempts || 0,
    completionRate: totalReferrals ? ((completedReferrals || 0) / totalReferrals * 100).toFixed(1) : '0'
  }
}

async function getReferralData() {
  const supabase = await createClient()
  
  // Get recent referrals with full details
  const { data: referrals } = await supabase
    .from('referrals')
    .select(`
      *,
      referrer:profiles!referrals_referrer_id_fkey(
        id,
        username,
        email_verified_at,
        is_suspicious,
        referrals_sent_count
      ),
      referred:profiles!referrals_referred_id_fkey(
        id,
        username,
        email_verified_at,
        is_suspicious
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20)
  
  // Get recent referral attempts
  const { data: attempts } = await supabase
    .from('referral_attempts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  
  // Get IP tracking data
  const { data: ipTracking } = await supabase
    .from('ip_security_tracking')
    .select('*')
    .order('last_seen_at', { ascending: false })
    .limit(20)
  
  // Get security configuration
  const { data: securityConfig } = await supabase
    .from('referral_security_config')
    .select('*')
    .eq('active', true)
    .order('config_key')
  
  // Get recent audit logs for referrals
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .or('table_name.eq.referrals,table_name.eq.profiles')
    .order('created_at', { ascending: false })
    .limit(20)
  
  // Detect fraud patterns
  const { data: fraudPatterns } = await supabase.rpc('detect_referral_fraud')
  
  return {
    referrals: referrals || [],
    attempts: attempts || [],
    ipTracking: ipTracking || [],
    securityConfig: securityConfig || [],
    auditLogs: auditLogs || [],
    fraudPatterns: fraudPatterns || []
  }
}

export default async function AdminReferralsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  const health = await getSystemHealth()
  const data = await getReferralData()
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-8 w-8 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Referral System Admin
            </h1>
            <p className="text-sm text-gray-600">
              Monitor, test, and manage the referral system
            </p>
          </div>
        </div>
      </div>
      
      {/* System Health Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            System Health
          </h2>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">Live</span>
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{health.totalReferrals}</p>
            <p className="text-xs text-gray-600">Total Referrals</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{health.pendingReferrals}</p>
            <p className="text-xs text-gray-600">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{health.completedReferrals}</p>
            <p className="text-xs text-gray-600">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{health.suspiciousUsers}</p>
            <p className="text-xs text-gray-600">Suspicious</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{health.blockedIps}</p>
            <p className="text-xs text-gray-600">Blocked IPs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{health.completionRate}%</p>
            <p className="text-xs text-gray-600">Success Rate</p>
          </div>
        </div>
      </div>
      
      {/* Fraud Alerts */}
      {data.fraudPatterns.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">
              Fraud Detection Alerts
            </h2>
          </div>
          <div className="space-y-2">
            {data.fraudPatterns.slice(0, 5).map((pattern: unknown, idx: number) => {
              const p = pattern as { suspicious_pattern?: string; user_id?: string };
              return (
              <div key={idx} className="flex items-center justify-between bg-white rounded p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {p.suspicious_pattern}
                  </p>
                  <p className="text-xs text-gray-600">
                    User: {p.user_id?.slice(0, 8)}...
                  </p>
                </div>
                <button className="text-xs text-red-600 hover:text-red-700 font-medium">
                  Investigate →
                </button>
              </div>
            )}
            )}
          </div>
        </div>
      )}
      
      {/* Test Panel */}
      <AdminTestPanel userId={user.id} />
      
      {/* Security Configuration */}
      <AdminSecurityConfig config={data.securityConfig} />
      
      {/* Referral Monitor */}
      <AdminReferralMonitor 
        referrals={data.referrals}
        attempts={data.attempts}
        ipTracking={data.ipTracking}
        auditLogs={data.auditLogs}
      />
      
      {/* Recent Referrals Table */}
      <div className="bg-white rounded-lg border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Recent Referrals (Full Details)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Referrer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Referred
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fraud Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  IP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.referrals.map((referral: unknown) => {
                const r = referral as {
                  id: string;
                  status: string;
                  fraud_score: number;
                  signup_ip?: string;
                  created_at: string;
                  referrer?: {
                    username?: string;
                    is_suspicious?: boolean;
                    email_verified_at?: string;
                  };
                  referred?: {
                    username?: string;
                    email_verified_at?: string;
                  };
                };
                return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {r.referrer?.username || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {r.referrer?.is_suspicious && (
                          <span className="text-red-600">⚠️ Suspicious</span>
                        )}
                        {r.referrer?.email_verified_at ? (
                          <span className="text-green-600">✓ Verified</span>
                        ) : (
                          <span className="text-yellow-600">Unverified</span>
                        )}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {r.referred?.username || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {r.referred?.email_verified_at ? (
                          <span className="text-green-600">✓ Verified</span>
                        ) : (
                          <span className="text-yellow-600">Unverified</span>
                        )}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      r.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : r.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${
                      r.fraud_score > 0.7
                        ? 'text-red-600'
                        : r.fraud_score > 0.4
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}>
                      {(r.fraud_score * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-xs font-mono text-gray-600">
                      {r.signup_ip || 'N/A'}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-xs text-gray-600">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                      Complete
                    </button>
                  </td>
                </tr>
              )}
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* IP Tracking Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-600" />
            IP Security Tracking
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Signups
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Referrals
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Suspicious
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Seen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.ipTracking.map((ip: unknown) => {
                const i = ip as {
                  id: string;
                  ip_address: string;
                  signup_count: number;
                  referral_count: number;
                  suspicious_activity_count: number;
                  is_blocked: boolean;
                  last_seen_at: string;
                };
                return (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-mono text-gray-900">{i.ip_address}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-900">{i.signup_count}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-900">{i.referral_count}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-900">{i.suspicious_activity_count}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {i.is_blocked ? (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        Blocked
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-xs text-gray-600">
                      {new Date(i.last_seen_at).toLocaleString()}
                    </p>
                  </td>
                </tr>
              )}
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}