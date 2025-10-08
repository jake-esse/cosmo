'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useNotifications } from './NotificationProvider'
import { format } from 'date-fns'
import { Bell, ChevronDown, ChevronRight, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface NotificationData {
  id: string
  user_id: string
  notice_id?: string | null
  notification_type: string
  title: string
  content: string
  action_url?: string | null
  action_text?: string | null
  priority: 'low' | 'normal' | 'high' | 'critical'
  read_at: string | null
  acknowledged_at?: string | null
  dismissed_at?: string | null
  metadata?: Record<string, unknown>
  created_at: string
  related_notice_id?: string | null
  time_group?: string
}

const priorityConfig = {
  low: { icon: Info, className: 'text-slate-400' },
  normal: { icon: Bell, className: 'text-sky-500' },
  high: { icon: AlertCircle, className: 'text-amber-500' },
  critical: { icon: XCircle, className: 'text-red-500' }
}

const getNoticeTypeLabel = (notification: NotificationData) => {
  // Check metadata for the actual notice type
  const noticeType = (notification.metadata as { notice_type?: string } | undefined)?.notice_type || notification.notification_type

  const typeLabels: Record<string, { label: string; className: string }> = {
    announcement: { label: 'Announcement', className: 'bg-sky-50 text-sky-600 border border-sky-200' },
    regulatory_update: { label: 'Regulatory', className: 'bg-red-50 text-red-600 border border-red-200' },
    maintenance: { label: 'Maintenance', className: 'bg-amber-50 text-amber-600 border border-amber-200' },
    security_alert: { label: 'Security', className: 'bg-purple-50 text-purple-600 border border-purple-200' },
    offering_update: { label: 'Offering', className: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
    terms_update: { label: 'Terms', className: 'bg-slate-50 text-slate-600 border border-slate-200' },
    feature_release: { label: 'Feature', className: 'bg-green-50 text-green-600 border border-green-200' },
    system_notice: { label: 'System', className: 'bg-sky-50 text-sky-600 border border-sky-200' },
    account_update: { label: 'Account', className: 'bg-indigo-50 text-indigo-600 border border-indigo-200' },
    equity_update: { label: 'Equity', className: 'bg-purple-50 text-purple-600 border border-purple-200' }
  }

  return typeLabels[noticeType] || { label: 'Notice', className: 'bg-slate-50 text-slate-600 border border-slate-200' }
}

export function NotificationTable() {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const { refreshCount } = useNotifications()
  const supabase = createClient()

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error loading notifications:', error)
        return
      }

      setNotifications(data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Mark as read
  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error marking as read:', error)
        return
      }

      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ))
      await refreshCount()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [supabase, refreshCount])

  // Dismiss notification
  const handleDismiss = useCallback(async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_notifications')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error dismissing:', error)
        return
      }

      setNotifications(prev => prev.filter(n => n.id !== id))
      await refreshCount()
    } catch (error) {
      console.error('Error dismissing notification:', error)
    }
  }, [supabase, refreshCount])

  // Toggle row expansion
  const toggleExpanded = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        // Mark as read when expanded
        if (notifications.find(n => n.id === id && !n.read_at)) {
          handleMarkAsRead(id)
        }
      }
      return next
    })
  }

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 font-sans">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12 font-sans">
        <Bell className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <p className="text-slate-600 font-medium">No notifications</p>
        <p className="text-sm text-slate-400 mt-1">You&apos;re all caught up!</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto font-sans">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">

            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">

            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {notifications.map((notification) => {
            const isExpanded = expandedRows.has(notification.id)
            const isUnread = !notification.read_at
            const typeInfo = getNoticeTypeLabel(notification)

            return (
              <React.Fragment key={notification.id}>
                <tr
                  className={cn(
                    "hover:bg-slate-50 transition-colors cursor-pointer",
                    isUnread && "bg-sky-50/50"
                  )}
                  onClick={() => toggleExpanded(notification.id)}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <button className="text-slate-400 hover:text-slate-600">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Badge className={typeInfo.className}>
                      {typeInfo.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <p className={cn(
                      "text-sm font-sans",
                      isUnread ? "font-semibold text-slate-900" : "text-slate-700"
                    )}>
                      {notification.title}
                    </p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 font-sans">
                    {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isUnread ? (
                      <Badge className="bg-sky-100 text-sky-700 border-sky-200 font-medium">New</Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200">Read</Badge>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDismiss(notification.id)
                      }}
                      className="text-slate-400 hover:text-slate-600"
                      title="Dismiss notification"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${notification.id}-expanded`}>
                    <td colSpan={6} className="px-4 py-4 bg-slate-50/50">
                      <div className="pl-8 space-y-3">
                        <div className="prose prose-sm max-w-none">
                          <p className="text-slate-700 whitespace-pre-wrap font-sans">{notification.content}</p>
                        </div>
                        {notification.metadata && (
                          <div className="text-xs text-slate-500 space-y-1 font-sans">
                            {(notification.metadata as { notice_type?: string }).notice_type && (
                              <p>Notice Type: {(notification.metadata as { notice_type: string }).notice_type}</p>
                            )}
                            {(notification.metadata as { broadcast_time?: string }).broadcast_time && (
                              <p>Broadcast: {format(new Date((notification.metadata as { broadcast_time: string }).broadcast_time), 'PPpp')}</p>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          {!notification.read_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkAsRead(notification.id)
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Mark as read
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDismiss(notification.id)
                            }}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}