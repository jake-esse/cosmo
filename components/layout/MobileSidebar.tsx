'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  VineIcon,
  PlusIcon,
  AppsIcon,
  ChatsIcon,
  SharesIcon,
  DataIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@/components/icons'

interface MenuItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface MobileSidebarProps {
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
  { label: 'Data', href: '/data', icon: DataIcon },
]

const accountMenuItems = [
  { label: 'Settings', href: '/settings' },
  { label: 'Log out', href: '/logout' },
]

export function MobileSidebar({ user }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [accountExpanded, setAccountExpanded] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => {
    // Only highlight Chats when on the history page specifically
    if (href === '/chat/history') {
      return pathname === '/chat/history'
    }
    return pathname === href
  }

  return (
    <>
      {/* Hamburger Button - Only visible on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 bg-white rounded-lg shadow-lg border border-slate-200"
        aria-label="Toggle menu"
      >
        <div className="w-5 h-5 flex flex-col justify-center space-y-1">
          <span className="block h-0.5 w-5 bg-slate-700 transition-all"></span>
          <span className="block h-0.5 w-5 bg-slate-700 transition-all"></span>
          <span className="block h-0.5 w-5 bg-slate-700 transition-all"></span>
        </div>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-in Sidebar */}
      <div 
        className={`
          md:hidden fixed left-0 top-0 h-full w-full bg-white
          transform transition-transform duration-300 ease-in-out z-50
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand Section - Matching landing page exactly */}
        <div className="absolute left-[20px] top-[9px] h-[47px]">
          <div className="relative h-full">
            {/* Logo */}
            <div className="absolute left-0 top-[8px] w-[32px] h-[31px] flex items-center justify-center">
              <VineIcon className="w-full h-full text-black" />
            </div>
            {/* Ampel text - smaller size, closer to logo, lowered by 2px */}
            <span className="absolute left-[30px] top-1/2 -translate-y-1/2 mt-[2px] font-sans font-medium text-[26px] text-black tracking-[-1.5px]">
              Ampel
            </span>
          </div>
        </div>

        {/* Menu Card */}
        <aside className="absolute left-[9px] top-[62px] bottom-[11px] w-[224px] rounded-[30px] overflow-hidden shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)] flex flex-col">
          {/* Background Image Layer */}
          <div 
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: 'url(/images/left-sidebar-2.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
          
          {/* Glassmorphism Overlay */}
          {/* <div className="absolute inset-0 bg-white/40 backdrop-blur-[15px] z-10" /> */}
          
          {/* Content Layer */}
          <div className="relative z-20 flex flex-col h-full">
          
          {/* Menu Items - evenly spaced from top */}
          <nav className="flex-1 px-[9px] pt-[9px]">
            <ul className="space-y-[6px]">
              {/* New chat Button - Circular with glassmorphism + text */}
              <li key="new-chat-button">
                <button
                  onClick={() => {
                    window.location.href = '/chat'
                    setIsOpen(false)
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
                </button>
              </li>

              {/* Regular menu items - no icons as preferred */}
              {menuItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`
                        flex items-center h-10 px-[5px] rounded-[4px]
                        ${active 
                          ? 'bg-white/60' 
                          : 'hover:bg-white/40'
                        }
                      `}
                    >
                      <span className="ml-[7px] font-sans font-bold text-[14px] tracking-[-0.35px] text-white">
                        {item.label}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Account Section */}
          <div className="relative">
            {/* Expanded Account Menu */}
            {accountExpanded && (
              <div className="absolute bottom-full left-0 right-0 bg-white/40 backdrop-blur-[15px] border-t border-white/30 rounded-t-[12px]">
                {accountMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="block px-[19px] py-2 text-body-md text-white hover:bg-white/40"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
            
            {/* Account Toggle - No divider line */}
            <div className="h-[51px] px-[19px] flex items-center">
              <button 
                onClick={() => setAccountExpanded(!accountExpanded)}
                className="flex items-center justify-between w-full"
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
      </div>
    </>
  )
}
