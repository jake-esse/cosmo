'use client'

import { useState, useEffect } from 'react'
import { Eye, AlertTriangle, Clock, Database } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface AdminReferralMonitorProps {
  referrals: unknown[]
  attempts: unknown[]
  ipTracking: unknown[]
  auditLogs: unknown[]
}

export default function AdminReferralMonitor({
  referrals,
  attempts,
  ipTracking,
  auditLogs
}: AdminReferralMonitorProps) {
  const [activeTab, setActiveTab] = useState<'attempts' | 'audit'>('attempts')
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 mb-8">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Eye className="h-5 w-5 text-indigo-600" />
          Monitoring Dashboard
        </h2>
        
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('attempts')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'attempts'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Referral Attempts
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'audit'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Audit Logs
          </button>
        </div>
      </div>
      
      <div className="p-6">
        {activeTab === 'attempts' && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              Recent Referral Attempts
            </h3>
            <div className="space-y-2">
              {attempts.length === 0 ? (
                <p className="text-sm text-gray-500">No recent attempts</p>
              ) : (
                (attempts as Array<{
                  id: string
                  referrer_id: string
                  referred_id: string
                  ip_address: string
                  fraud_score: number
                  status: string
                  created_at: string
                }>).map((attempt) => (
                  <div
                    key={attempt.id}
                    className={`border rounded-lg p-4 ${
                      attempt.success
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {attempt.success ? (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                          <p className="text-sm font-medium text-gray-900">
                            Code: {attempt.attempted_code}
                          </p>
                        </div>
                        {!attempt.success && (
                          <p className="text-xs text-red-600 mt-1">
                            Failed: {attempt.failure_reason}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                          <span>IP: {attempt.attempt_ip || 'Unknown'}</span>
                          <span>
                            {mounted ? (
                              formatDistanceToNow(new Date(attempt.created_at), { addSuffix: true })
                            ) : (
                              'Loading...'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'audit' && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              Audit Log Events
            </h3>
            <div className="space-y-2">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-gray-500">No recent audit logs</p>
              ) : (
                (auditLogs as Array<{
                  id: string
                  table_name: string
                  operation: string
                  user_id: string
                  created_at: string
                }>).map((log) => (
                  <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-gray-400" />
                          <p className="text-sm font-medium text-gray-900">
                            {log.table_name} • {log.operation}
                          </p>
                        </div>
                        {log.new_data && (
                          <div className="mt-2 bg-gray-50 rounded p-2">
                            <pre className="text-xs text-gray-600 overflow-x-auto">
                              {JSON.stringify(log.new_data, null, 2)}
                            </pre>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                          <span>User: {log.user_id?.slice(0, 8)}...</span>
                          {log.ip_address && <span>IP: {log.ip_address}</span>}
                          <span>
                            {mounted ? (
                              formatDistanceToNow(new Date(log.created_at), { addSuffix: true })
                            ) : (
                              'Loading...'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}