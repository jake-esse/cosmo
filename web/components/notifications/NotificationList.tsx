'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { NotificationItem, NotificationData } from './NotificationItem'
import { createClient } from '@/lib/supabase/client'
import { useNotifications } from './NotificationProvider'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NotificationListProps {
  includeRead?: boolean
  includeDismissed?: boolean
  limit?: number
}

interface GroupedNotifications {
  [key: string]: NotificationData[]
}

const TIME_GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Older']

export function NotificationList({
  includeRead = true,
  includeDismissed = false,
  limit = 20
}: NotificationListProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const { refreshCount, markAsRead } = useNotifications()
  const supabase = createClient()

  // Load notifications
  const loadNotifications = useCallback(async (pageNumber: number = 0) => {
    try {
      setLoading(true)

      const { data, error } = await supabase.rpc('get_user_notifications', {
        p_limit: limit,
        p_offset: pageNumber * limit,
        p_include_read: includeRead,
        p_include_dismissed: includeDismissed
      })

      if (error) {
        console.error('Error calling get_user_notifications:', error)
        // Fallback to direct table query if RPC doesn't exist yet
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('user_notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit)
          .range(pageNumber * limit, (pageNumber + 1) * limit - 1)

        if (fallbackError) {
          console.error('Fallback query error:', fallbackError)
          return
        }

        const typedData = (fallbackData || []) as NotificationData[]

        if (pageNumber === 0) {
          setNotifications(typedData)
        } else {
          setNotifications(prev => [...prev, ...typedData])
        }

        setHasMore(typedData.length === limit)
        return
      }

      const typedData = (data || []) as NotificationData[]

      if (pageNumber === 0) {
        setNotifications(typedData)
      } else {
        setNotifications(prev => [...prev, ...typedData])
      }

      setHasMore(typedData.length === limit)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, includeRead, includeDismissed, limit])

  // Handle mark as read
  const handleMarkAsRead = useCallback(async (id: string) => {
    await markAsRead([id])

    // Update local state
    setNotifications(prev =>
      prev.map(n =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    )
  }, [markAsRead])

  // Handle dismiss
  const handleDismiss = useCallback(async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.rpc('dismiss_notifications', {
        p_notification_ids: [id]
      })

      if (error) {
        console.error('Error calling dismiss_notifications:', error)
        // Fallback to direct update
        const { error: updateError } = await supabase
          .from('user_notifications')
          .update({ dismissed_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id)

        if (updateError) {
          console.error('Fallback dismiss error:', updateError)
          return
        }
      }

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== id))
      await refreshCount()
    } catch (error) {
      console.error('Error dismissing notification:', error)
    }
  }, [supabase, refreshCount])

  // Load more notifications
  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadNotifications(nextPage)
  }

  // Initial load
  useEffect(() => {
    loadNotifications(0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Group notifications by time
  const groupedNotifications = notifications.reduce<GroupedNotifications>((acc, notification) => {
    const group = notification.time_group || 'Older'
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(notification)
    return acc
  }, {})

  // Sort groups by predefined order
  const sortedGroups = TIME_GROUP_ORDER.filter(group => groupedNotifications[group])

  if (loading && page === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No notifications</p>
        <p className="text-sm text-gray-400 mt-1">You&apos;re all caught up!</p>
      </div>
    )
  }

  return (
    <div>
      {sortedGroups.map(group => (
        <div key={group} className="mb-6">
          <h3 className="px-6 py-2 text-sm font-medium text-gray-500 bg-gray-50 border-y border-gray-100">
            {group}
          </h3>
          <div className="divide-y divide-gray-100">
            {groupedNotifications[group].map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="p-6 text-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

// Import Bell icon since it was used but not imported
import { Bell } from 'lucide-react'