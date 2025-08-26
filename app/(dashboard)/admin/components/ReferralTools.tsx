'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wrench, AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react'

interface ProcessingResult {
  success: boolean
  total_processed?: number
  total_completed?: number
  total_errors?: number
  details?: any[]
  error?: string
}

export default function ReferralTools() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [isLoadingCount, setIsLoadingCount] = useState(false)

  const fetchPendingCount = async () => {
    setIsLoadingCount(true)
    try {
      const supabase = createClient()
      
      // Get count of pending referrals with verified emails
      const { count, error } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      
      if (error) {
        console.error('Error fetching pending count:', error)
        setPendingCount(null)
      } else {
        setPendingCount(count || 0)
      }
    } catch (err) {
      console.error('Exception fetching pending count:', err)
      setPendingCount(null)
    } finally {
      setIsLoadingCount(false)
    }
  }

  const processStuckReferrals = async () => {
    setIsProcessing(true)
    setResult(null)
    
    try {
      const supabase = createClient()
      
      // Try the admin complete all pending referrals function
      const { data, error } = await supabase.rpc('admin_complete_all_pending_referrals')
      
      if (error) {
        // Fallback to other functions if the main one fails
        const { data: fallbackData, error: fallbackError } = await supabase.rpc('admin_force_complete_all_referrals')
        
        if (fallbackError) {
          setResult({
            success: false,
            error: `Admin function failed: ${error.message}. Fallback also failed: ${fallbackError.message}`
          })
        } else {
          setResult({
            success: true,
            ...fallbackData
          })
        }
      } else {
        setResult({
          success: true,
          ...data
        })
      }
      
      // Refresh pending count after processing
      await fetchPendingCount()
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'An unknown error occurred'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Load pending count on mount
  useState(() => {
    fetchPendingCount()
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-gray-600" />
          Referral Management Tools
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Manually process stuck referrals and manage the referral system
        </p>
      </div>

      {/* Pending Referrals Count */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Pending Referrals</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {isLoadingCount ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              ) : (
                pendingCount !== null ? pendingCount : '—'
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Referrals waiting to be completed
            </p>
          </div>
          <button
            onClick={fetchPendingCount}
            disabled={isLoadingCount}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh count"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingCount ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Process Stuck Referrals Button */}
      <div className="space-y-4">
        <div>
          <button
            onClick={processStuckReferrals}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing Referrals...
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4" />
                Force Complete All Pending Referrals
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Admin action: Force completes ALL pending referrals bypassing security checks (for testing)
          </p>
        </div>

        {/* Results Display */}
        {result && (
          <div className={`p-4 rounded-lg ${
            result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  result.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {result.success ? 'Processing Complete' : 'Processing Failed'}
                </p>
                
                {result.success && (
                  <div className="mt-2 space-y-1 text-sm text-green-800">
                    <p>• Processed: {result.total_processed || 0} referrals</p>
                    <p>• Completed: {result.total_completed || 0} referrals</p>
                    {result.total_errors ? (
                      <p>• Errors: {result.total_errors} referrals</p>
                    ) : null}
                  </div>
                )}
                
                {result.error && (
                  <p className="mt-1 text-sm text-red-700">{result.error}</p>
                )}

                {/* Detailed Results */}
                {result.details && result.details.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                      View Details ({result.details.length} items)
                    </summary>
                    <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                      {result.details.map((detail: any, index: number) => (
                        <div key={index} className="text-xs bg-white p-2 rounded border border-gray-200">
                          <p className="font-mono text-gray-600">
                            {detail.email} - {detail.status}
                          </p>
                          {detail.error && (
                            <p className="text-red-600 mt-1">{detail.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Tools Info */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-2">How it works:</h3>
        <ul className="space-y-1 text-xs text-gray-600">
          <li>• Finds all referrals with status = 'pending'</li>
          <li>• Checks if the referred user's email is verified</li>
          <li>• Completes the referral and awards points to both users</li>
          <li>• Logs all operations to the audit table</li>
        </ul>
      </div>
    </div>
  )
}