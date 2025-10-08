'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  PlusIcon,
  AppsIcon,
  ChatsIcon,
  SharesIcon,
  DataIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@/components/icons'
import { useNotifications } from '@/components/notifications/NotificationProvider'
import { useNavigation } from './NavigationContext'

interface MenuItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface FixedSidebarProps {
  user?: {
    name: string
    email: string
    initials: string
  }
}

const menuItems: MenuItem[] = [
  { label: 'Chats', href: '/chat/history', icon: ChatsIcon },
  { label: 'Apps', href: '/apps', icon: AppsIcon },
  { label: 'Shares', href: '/shares', icon: SharesIcon },
  { label: 'Data', href: '/data-controls', icon: DataIcon },
]

const accountMenuItems = [
  { label: 'Notifications', href: '/notifications' },
  { label: 'Settings', href: '/settings' },
  { label: 'Referrals', href: '/referrals' },
  { label: 'Log out', href: '/logout' },
]

export function FixedSidebar({ user }: FixedSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [accountExpanded, setAccountExpanded] = useState(false)
  const { unreadCount } = useNotifications()
  const { setActiveChat } = useNavigation()

  // Prefetch /chat route on mount for instant navigation
  useEffect(() => {
    router.prefetch('/chat')
  }, [router])

  const isActive = (href: string) => {
    // Only highlight Chats when on the history page specifically
    if (href === '/chat/history') {
      return pathname === '/chat/history'
    }
    // Highlight notifications when on notifications page
    if (href === '/notifications') {
      return pathname === '/notifications'
    }
    return pathname === href
  }

  return (
    <aside className="absolute left-[9px] top-[62px] bottom-[11px] w-[224px] rounded-[30px] overflow-hidden shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)] flex flex-col">
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/left-sidebar-2.webp"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="224px"
        />
      </div>

      {/* Glassmorphism Overlay */}
      {/* <div className="absolute inset-0 bg-white/40 backdrop-blur-[15px] z-10" /> */}

      {/* Content Layer */}
      <div className="relative z-20 flex flex-col h-full">
      
      {/* Menu Items - evenly spaced from top */}
      <nav className="flex-1 px-[9px] pt-[9px]">
        <ul className="space-y-[6px]">
          {/* New chat Button - Circular with glassmorphism + text */}
          <li key="new-chat-button">
            <Link
              href="/chat"
              prefetch={true}
              onClick={(e) => {
                setActiveChat(null)
              }}
              className="flex items-center gap-1 w-full group"
            >
              <div
                className="relative w-10 h-10 rounded-full bg-white/40 backdrop-blur-[15px]
                           transition-all duration-200 ease-out
                           group-hover:bg-white/60 group-hover:scale-[1.05]
                           group-active:scale-[0.98]
                           flex items-center justify-center flex-shrink-0"
              >
                <PlusIcon className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <span className="font-brand text-[20px] leading-[22px] font-semibold text-white">
                New chat
              </span>
            </Link>
          </li>

          {/* Regular menu items */}
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center h-10 px-[5px] rounded-[4px]
                    ${active 
                      ? 'bg-white/60' 
                      : 'hover:bg-white/40'
                    }
                  `}
                >
                  {/* Icons removed as preferred - clean text-only menu */}
                  <span className="ml-[7px] font-sans font-bold text-[14px] tracking-[-0.35px] text-white">
                    {item.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Account Section - Expandable */}
      <div className="relative">
        {/* Expanded Account Menu */}
        {accountExpanded && (
          <div className="absolute bottom-full left-0 right-0 bg-white/40 backdrop-blur-[15px] border-t border-white/30 rounded-t-[12px]">
            {accountMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-[19px] py-2 text-body-md text-white hover:bg-white/40 flex items-center justify-between"
              >
                <span>{item.label}</span>
                {item.label === 'Notifications' && unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Account Menu Toggle - No divider line above */}
        <div className="h-[51px] px-[19px] flex items-center">
          <button 
            onClick={() => setAccountExpanded(!accountExpanded)}
            className="flex items-center justify-between w-full group"
          >
            <span className="font-brand text-[18px] leading-[20px] font-normal text-white">
              {user?.name || 'Jake Esse'}
            </span>
            {accountExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-white" strokeWidth={1} />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-white" strokeWidth={1} />
            )}
          </button>
        </div>
      </div>
      </div>
    </aside>
  )
}
