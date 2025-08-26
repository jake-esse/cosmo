'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircle, Clock, XCircle, User } from 'lucide-react'

interface Referral {
  id: string
  status: 'pending' | 'completed' | 'expired' | 'cancelled'
  created_at: string
  completed_at?: string | null
  referred_id: string
  referred?: {
    username?: string
    display_name?: string
    created_at: string
  }
}

interface ReferralListProps {
  referrals: Referral[]
}

export default function ReferralList({ referrals }: ReferralListProps) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'expired':
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-400" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'pending':
        return 'Pending Verification'
      case 'expired':
        return 'Expired'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-50'
      case 'pending':
        return 'text-yellow-700 bg-yellow-50'
      case 'expired':
      case 'cancelled':
        return 'text-gray-700 bg-gray-50'
      default:
        return 'text-gray-700 bg-gray-50'
    }
  }
  
  const getPointsEarned = (status: string) => {
    return status === 'completed' ? '+50' : '—'
  }
  
  const formatUserDisplay = (referral: Referral) => {
    if (referral.referred?.display_name) {
      return referral.referred.display_name
    }
    if (referral.referred?.username) {
      // Partially hide username for privacy
      const username = referral.referred.username
      if (username.length > 4) {
        return `${username.slice(0, 2)}***${username.slice(-2)}`
      }
      return `${username.slice(0, 1)}***`
    }
    return 'Anonymous User'
  }
  
  if (!referrals || referrals.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <User className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-sm font-medium text-gray-900 mb-1">
          No referrals yet
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Share your referral code to start earning points
        </p>
        <p className="text-xs text-gray-500">
          You'll earn 50 points for each friend who joins
        </p>
      </div>
    )
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Points
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {referrals.map((referral) => (
            <tr key={referral.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {formatUserDisplay(referral)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {mounted ? (
                        <>Joined {formatDistanceToNow(new Date(referral.referred?.created_at || referral.created_at), { addSuffix: true })}</>
                      ) : (
                        <>Joined recently</>
                      )}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  {getStatusIcon(referral.status)}
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(referral.status)}`}>
                    {getStatusText(referral.status)}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <p className="text-sm text-gray-900">
                    {mounted ? (
                      new Date(referral.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    ) : (
                      'Loading...'
                    )}
                  </p>
                  {referral.completed_at && (
                    <p className="text-xs text-gray-500">
                      {mounted ? (
                        <>Completed {formatDistanceToNow(new Date(referral.completed_at), { addSuffix: true })}</>
                      ) : (
                        <>Completed</>
                      )}
                    </p>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <span className={`text-sm font-medium ${
                  referral.status === 'completed' ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {getPointsEarned(referral.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Mobile View */}
      <div className="sm:hidden">
        {referrals.map((referral) => (
          <div key={referral.id} className="p-4 border-b border-gray-200">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatUserDisplay(referral)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {mounted ? (
                      new Date(referral.created_at).toLocaleDateString()
                    ) : (
                      'Loading...'
                    )}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-medium ${
                referral.status === 'completed' ? 'text-green-600' : 'text-gray-400'
              }`}>
                {getPointsEarned(referral.status)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(referral.status)}
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(referral.status)}`}>
                {getStatusText(referral.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}