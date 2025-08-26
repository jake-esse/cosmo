'use client'

import { useState } from 'react'
import { Zap, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  completeReferralManually,
  testFraudDetection,
  testReferralValidation,
  testIdempotency,
  clearReferralAttempts
} from '@/app/(dashboard)/admin/actions'

interface AdminTestPanelProps {
  userId: string
}

export default function AdminTestPanel({ userId }: AdminTestPanelProps) {
  const [testing, setTesting] = useState<string | null>(null)
  const [results, setResults] = useState<any>({})
  
  const handleCompleteReferral = async () => {
    setTesting('complete')
    const testUserId = prompt('Enter referred user ID to complete:')
    if (!testUserId) return
    
    const result = await completeReferralManually(testUserId)
    setResults(prev => ({ ...prev, complete: result }))
    setTesting(null)
  }
  
  const handleTestFraud = async () => {
    setTesting('fraud')
    const referrerId = prompt('Enter referrer ID:') || userId
    const referredId = prompt('Enter referred ID:') || userId
    const testIp = prompt('Enter test IP:') || '192.168.1.1'
    
    const result = await testFraudDetection(referrerId, referredId, testIp)
    setResults(prev => ({ ...prev, fraud: result }))
    setTesting(null)
  }
  
  const handleTestValidation = async () => {
    setTesting('validation')
    const testUserId = prompt('Enter user ID to test:') || userId
    const code = prompt('Enter referral code:') || 'TEST1234'
    
    const result = await testReferralValidation(testUserId, code)
    setResults(prev => ({ ...prev, validation: result }))
    setTesting(null)
  }
  
  const handleTestIdempotency = async () => {
    setTesting('idempotency')
    const testUserId = prompt('Enter user ID:') || userId
    const requestId = `test_${Date.now()}`
    
    const result = await testIdempotency(testUserId, requestId)
    setResults(prev => ({ ...prev, idempotency: result }))
    setTesting(null)
  }
  
  const handleClearAttempts = async () => {
    setTesting('clear')
    const confirm = window.confirm('Clear all old referral attempts?')
    if (!confirm) return
    
    const result = await clearReferralAttempts()
    setResults(prev => ({ ...prev, clear: result }))
    setTesting(null)
  }
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-600" />
          Testing Panel
        </h2>
        <span className="text-xs text-gray-500">Admin Functions</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCompleteReferral}
          disabled={testing === 'complete'}
        >
          {testing === 'complete' ? (
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <CheckCircle className="h-3 w-3 mr-1" />
          )}
          Complete Referral
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestFraud}
          disabled={testing === 'fraud'}
        >
          {testing === 'fraud' ? (
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Zap className="h-3 w-3 mr-1" />
          )}
          Test Fraud Score
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestValidation}
          disabled={testing === 'validation'}
        >
          {testing === 'validation' ? (
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <CheckCircle className="h-3 w-3 mr-1" />
          )}
          Test Validation
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestIdempotency}
          disabled={testing === 'idempotency'}
        >
          {testing === 'idempotency' ? (
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Zap className="h-3 w-3 mr-1" />
          )}
          Test Idempotency
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearAttempts}
          disabled={testing === 'clear'}
        >
          {testing === 'clear' ? (
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <XCircle className="h-3 w-3 mr-1" />
          )}
          Clear Attempts
        </Button>
      </div>
      
      {/* Test Results Display */}
      {Object.keys(results).length > 0 && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Test Results</h3>
          <div className="space-y-2">
            {Object.entries(results).map(([key, result]: [string, any]) => (
              <div key={key} className="bg-gray-50 rounded p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {key} Test
                    </p>
                    {result.success ? (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Success
                        </span>
                        {result.data && (
                          <pre className="mt-2 text-xs text-gray-600 overflow-x-auto">
                            {JSON.stringify(result.data || result, null, 2)}
                          </pre>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 text-xs text-red-600">
                          <XCircle className="h-3 w-3" />
                          Failed: {result.error}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setResults(prev => {
                      const newResults = { ...prev }
                      delete newResults[key]
                      return newResults
                    })}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}