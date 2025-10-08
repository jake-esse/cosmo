/**
 * useKYCStatus Hook
 * Polls KYC verification status in real-time
 */

import { useEffect, useState, useRef } from 'react'
import type { KYCSessionStatus } from '@shared/types/persona'

export interface KYCStatusData {
  status: KYCSessionStatus
  completed: boolean
  inquiryId?: string
}

export interface UseKYCStatusReturn {
  data: KYCStatusData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook for polling KYC verification status
 *
 * @param sessionToken - Session token from initiate API
 * @param enabled - Whether to enable polling (default: true)
 * @returns Current status, loading state, and error
 */
export function useKYCStatus(
  sessionToken: string | null,
  enabled: boolean = true
): UseKYCStatusReturn {
  const [data, setData] = useState<KYCStatusData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollCountRef = useRef<number>(0)
  const mountedRef = useRef<boolean>(true)

  const fetchStatus = async () => {
    if (!sessionToken) {
      setError('No session token provided')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(
        `/api/kyc/status?session_token=${sessionToken}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch status`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch verification status')
      }

      if (mountedRef.current) {
        setData({
          status: result.status,
          completed: result.completed,
          inquiryId: result.inquiryId,
        })
        setError(null)
        setLoading(false)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }
  }

  // Calculate poll interval with exponential backoff after 30 seconds
  const getPollInterval = (): number => {
    const count = pollCountRef.current
    const INITIAL_INTERVAL = 2000 // 2 seconds
    const BACKOFF_THRESHOLD = 15 // After 30 seconds (15 polls × 2s)

    if (count < BACKOFF_THRESHOLD) {
      return INITIAL_INTERVAL
    } else if (count < BACKOFF_THRESHOLD * 2) {
      return 4000 // 4 seconds
    } else {
      return 8000 // 8 seconds
    }
  }

  // Start polling
  useEffect(() => {
    mountedRef.current = true

    if (!enabled || !sessionToken) {
      setLoading(false)
      return
    }

    // Initial fetch
    fetchStatus()
    pollCountRef.current = 0

    // Setup polling with dynamic interval
    const startPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      const interval = getPollInterval()

      intervalRef.current = setInterval(() => {
        pollCountRef.current += 1
        fetchStatus()

        // Update interval with backoff
        if (pollCountRef.current === 15 || pollCountRef.current === 30) {
          startPolling() // Restart with new interval
        }
      }, interval)
    }

    startPolling()

    // Cleanup
    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [sessionToken, enabled])

  // Stop polling when completed
  useEffect(() => {
    if (data?.completed && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [data?.completed])

  return {
    data,
    loading,
    error,
    refetch: fetchStatus,
  }
}
