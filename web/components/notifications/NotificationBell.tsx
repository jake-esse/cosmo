'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useNotifications } from './NotificationProvider'

interface NotificationCount {
  total_unread: number
  critical_unread: number
  high_unread: number
  normal_unread: number
  low_unread: number
}

export function NotificationBell() {
  const { unreadCount, refreshCount } = useNotifications()
  const [isLoading, setIsLoading] = useState(false)

  // Display count (max 99+)
  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString()
  const showBadge = unreadCount > 0

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-full
                 bg-white/40 backdrop-blur-[15px] hover:bg-white/60
                 transition-all duration-200 ease-out group"
      aria-label={`Notifications${showBadge ? ` - ${unreadCount} unread` : ''}`}
    >
      <Bell className="w-5 h-5 text-white" />

      {showBadge && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px]
                       flex items-center justify-center px-1
                       bg-red-500 text-white text-[10px] font-bold
                       rounded-full ring-2 ring-white/40">
          {displayCount}
        </span>
      )}
    </Link>
  )
}