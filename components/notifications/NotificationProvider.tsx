'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { toast } from 'sonner'

interface NotificationContextValue {
  unreadCount: number
  refreshCount: () => Promise<void>
  markAsRead: (notificationIds: string[]) => Promise<void>
  markAllAsRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: React.ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const supabase = createClient()

  // Fetch unread count
  const refreshCount = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.rpc('get_unread_notification_count')

      if (error) {
        console.error('Error calling get_unread_notification_count:', error)
        // Fallback to direct count query
        const { count, error: countError } = await supabase
          .from('user_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('read_at', null)
          .is('dismissed_at', null)

        if (!countError) {
          setUnreadCount(count || 0)
        }
        return
      }

      if (data && data.length > 0) {
        setUnreadCount(Number(data[0].total_unread) || 0)
      }
    } catch (error) {
      console.error('Error fetching notification count:', error)
    }
  }, [supabase])

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.rpc('mark_notifications_read', {
        p_notification_ids: notificationIds
      })

      if (error) {
        console.error('Error calling mark_notifications_read:', error)
        // Fallback to direct update
        const { error: updateError } = await supabase
          .from('user_notifications')
          .update({ read_at: new Date().toISOString() })
          .in('id', notificationIds)
          .eq('user_id', user.id)

        if (updateError) {
          console.error('Fallback update error:', updateError)
          return
        }
      }

      await refreshCount()
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }, [supabase, refreshCount])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.rpc('mark_all_notifications_read')

      if (error) {
        console.error('Error calling mark_all_notifications_read:', error)
        // Fallback to direct update
        const { error: updateError } = await supabase
          .from('user_notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .is('read_at', null)

        if (updateError) {
          console.error('Fallback update error:', updateError)
          return
        }
      }

      await refreshCount()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [supabase, refreshCount])

  // Set up real-time subscription
  useEffect(() => {
    let mounted = true

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) return

      // Initial count fetch
      await refreshCount()

      // Subscribe to new notifications
      const newChannel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            // Update count
            refreshCount()

            // Show toast for high priority notifications
            const notification = payload.new as {
              priority?: string
              title?: string
              content?: string
            }
            if (notification.priority === 'critical' || notification.priority === 'high') {
              toast(notification.title || 'Notification', {
                description: notification.content,
              })
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            // Update count when notifications are marked as read
            refreshCount()
          }
        )
        .subscribe()

      if (mounted) {
        setChannel(newChannel)
      }
    }

    setupRealtimeSubscription()

    return () => {
      mounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [channel, supabase])

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        refreshCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}