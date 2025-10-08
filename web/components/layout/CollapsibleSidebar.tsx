'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/hooks/use-sidebar'
import {
  VineIcon,
  PlusIcon,
  AppsIcon,
  ChatsIcon,
  SharesIcon,
  DataIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@/components/icons'

interface MenuItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface CollapsibleSidebarProps {
  user?: {
    name: string
    email: string
    initials: string
  }
}

const menuItems: MenuItem[] = [
  { label: 'Apps', href: '/apps', icon: AppsIcon },
  { label: 'Chats', href: '/chat/history', icon: ChatsIcon },
  { label: 'Shares', href: '/equity-wallet', icon: SharesIcon },
  { label: 'Data', href: '/data-controls', icon: DataIcon },
]

export function CollapsibleSidebar({ user }: CollapsibleSidebarProps) {
  const pathname = usePathname()
  const { isCollapsed, isLoading, toggle } = useSidebar()

  if (isLoading) {
    return <div className={`${isCollapsed ? 'w-[60px]' : 'w-[224px]'} transition-all duration-300`} />
  }

  const isActive = (href: string) => {
    // Only highlight Chats when on the history page specifically
    if (href === '/chat/history') {
      return pathname === '/chat/history'
    }
    return pathname === href
  }

  return (
    <aside
      className={`
        relative flex flex-col h-screen bg-white border-r border-slate-100
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-[60px]' : 'w-[224px]'}
      `}
    >
      {/* Logo Section */}
      <div className="flex items-center h-16 px-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <VineIcon className="w-9 h-9 text-black flex-shrink-0" />
          {!isCollapsed && (
            <span className="text-xl font-brand text-slate-900 transition-opacity duration-300">
              Ampel
            </span>
          )}
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pt-4 pb-2">
        <button
          className={`
            w-full flex items-center justify-center gap-2 
            bg-black text-white rounded-lg
            hover:bg-slate-800 transition-all duration-200
            ${isCollapsed ? 'h-10 px-0' : 'h-11 px-4'}
          `}
          onClick={() => window.location.href = '/chat'}
        >
          <PlusIcon className="w-5 h-5" />
          {!isCollapsed && (
            <span className="font-semibold transition-opacity duration-300">
              New Chat
            </span>
          )}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-3 py-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg
                    transition-all duration-200
                    ${active 
                      ? 'bg-slate-100 text-slate-900' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="transition-opacity duration-300">
                      {item.label}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="border-t border-slate-100 p-3">
        <button
          className={`
            w-full flex items-center gap-2 px-3 py-2 rounded-lg
            hover:bg-slate-50 transition-all duration-200
            ${isCollapsed ? 'justify-center' : ''}
          `}
        >
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium text-slate-600 flex-shrink-0">
            {user?.initials || 'U'}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-slate-900 truncate">
                  {user?.name || 'User'}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {user?.email || 'user@example.com'}
                </div>
              </div>
              <ChevronDownIcon className="w-4 h-4 text-slate-400" />
            </>
          )}
        </button>
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={toggle}
        className={`
          absolute top-20 -right-3 w-6 h-6 
          bg-white border border-slate-200 rounded-full
          flex items-center justify-center
          hover:bg-slate-50 transition-all duration-200
          shadow-sm hover:shadow-md
        `}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRightIcon className="w-3 h-3 text-slate-600" />
        ) : (
          <ChevronLeftIcon className="w-3 h-3 text-slate-600" />
        )}
      </button>
    </aside>
  )
}