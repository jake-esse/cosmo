'use client'

import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { AlertCircle, Info, AlertTriangle, Bell, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NotificationData {
  id: string
  notice_id?: string
  notification_type: 'system_notice' | 'account_update' | 'equity_update' | 'compliance_requirement' | 'kyc_status' | 'offering_status' | 'referral_update' | 'subscription_update'
  priority: 'critical' | 'high' | 'normal' | 'low'
  title: string
  content: string
  metadata?: Record<string, unknown>
  read_at?: string | null
  dismissed_at?: string | null
  created_at: string
  time_group?: string
}

interface NotificationItemProps {
  notification: NotificationData
  onMarkAsRead?: (id: string) => void
  onDismiss?: (id: string) => void
}

const priorityConfig = {
  critical: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badge: 'bg-red-100 text-red-700 border-red-200',
  },
  high: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  normal: {
    icon: Info,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    badge: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  low: {
    icon: Bell,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-700 border-gray-200',
  },
}

const typeLabels: Record<NotificationData['notification_type'], string> = {
  system_notice: 'System',
  account_update: 'Account',
  equity_update: 'Equity',
  compliance_requirement: 'Compliance',
  kyc_status: 'KYC',
  offering_status: 'Offering',
  referral_update: 'Referral',
  subscription_update: 'Subscription',
}

export function NotificationItem({ notification, onMarkAsRead, onDismiss }: NotificationItemProps) {
  const config = priorityConfig[notification.priority]
  const Icon = config.icon
  const isUnread = !notification.read_at

  const handleClick = () => {
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(notification.id)
    }
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDismiss) {
      onDismiss(notification.id)
    }
  }

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  })

  return (
    <div
      className={cn(
        'relative px-6 py-4 transition-all duration-200 cursor-pointer group',
        'border-b border-gray-100 last:border-b-0',
        isUnread ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-50',
        isUnread && 'border-l-4',
        isUnread && config.borderColor
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          config.bgColor
        )}>
          <Icon className={cn('w-5 h-5', config.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header with badges */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(
                'font-medium text-black',
                isUnread && 'font-semibold'
              )}>
                {notification.title}
              </h3>

              {/* Type badge */}
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                config.badge
              )}>
                {typeLabels[notification.notification_type]}
              </span>

              {/* Unread indicator */}
              {isUnread && (
                <span className="inline-flex w-2 h-2 bg-sky-500 rounded-full" />
              )}
            </div>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {notification.content}
          </p>

          {/* Timestamp */}
          <p className="text-xs text-gray-400">
            {timeAgo}
          </p>
        </div>
      </div>
    </div>
  )
}