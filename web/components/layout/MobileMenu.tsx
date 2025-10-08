'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  PlusIcon,
  AppsIcon,
  ChatsIcon,
  SharesIcon,
  DataIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  VineIcon
} from '@/components/icons'
import { X, Menu } from 'lucide-react'

interface MobileMenuProps {
  user?: {
    name: string
    email: string
    initials: string
  }
}

interface MenuItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const menuItems: MenuItem[] = [
  { label: 'New chat', href: '/chat', icon: PlusIcon },
  { label: 'Chat History', href: '/chat/history', icon: ChatsIcon },
  { label: 'Apps', href: '/apps', icon: AppsIcon },
  { label: 'Shares', href: '/shares', icon: SharesIcon },
  { label: 'Data Controls', href: '/data-controls', icon: DataIcon },
]

const accountMenuItems = [
  { label: 'Settings', href: '/settings' },
  { label: 'Referrals', href: '/referrals' },
  { label: 'Log out', href: '/logout' },
]

export function MobileMenu({ user }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [accountExpanded, setAccountExpanded] = useState(false)
  const pathname = usePathname()
  const supabase = createClient()
  
  // Determine if we're on a page with the hero background
  const hasHeroBackground = pathname === '/chat' || (pathname?.startsWith('/chat/') && pathname !== '/chat/history')

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false)
    setAccountExpanded(false)
  }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const isActive = (href: string) => {
    if (href === '/chat') {
      return pathname === '/chat' || (pathname?.startsWith('/chat/') && pathname !== '/chat/history')
    }
    if (href === '/chat/history') {
      return pathname === '/chat/history'
    }
    return pathname?.startsWith(href)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      {/* Hamburger Button - Adapts based on background */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`md:hidden fixed top-3 left-3 z-50 p-2.5 rounded-full shadow-sm transition-all ${
          hasHeroBackground 
            ? 'bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30' 
            : 'bg-white/80 backdrop-blur-md border border-slate-200/30 hover:bg-white/90'
        }`}
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className={`w-4 h-4 ${hasHeroBackground ? 'text-white' : 'text-slate-700'}`} />
        ) : (
          <Menu className={`w-4 h-4 ${hasHeroBackground ? 'text-white' : 'text-slate-700'}`} />
        )}
      </button>

      {/* Full Screen Mobile Menu */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 flex flex-col"
        >
          {/* Close button - Always visible on top */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-3 left-3 z-30 p-2.5 bg-white/20 backdrop-blur-md rounded-full shadow-sm border border-white/30 hover:bg-white/30 transition-all"
            aria-label="Close menu"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          {/* Background Image - Same as chat */}
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: 'url(/images/hero-landscape.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
          
          {/* Dark overlay for better readability */}
          <div className="absolute inset-0 bg-black/20 z-10" />
          
          {/* Content Layer */}
          <div className="relative z-20 flex flex-col h-full">
            {/* Header with Brand - Same position as chat page */}
            <div className="pt-16 pb-8 text-center">
              <div className="flex items-end justify-center gap-2">
                <VineIcon className="w-10 h-10 text-white" />
                <span className="font-sans font-medium text-[32px] text-white tracking-[-1.5px] leading-[0.75]">
                  Ampel
                </span>
              </div>
            </div>

            {/* Centered Menu Items */}
            <nav className="flex-1 flex flex-col items-center justify-center px-8 -mt-20">
              <ul className="space-y-4 w-full max-w-sm">
                {menuItems.map((item) => {
                  const active = isActive(item.href)
                  
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`
                          flex items-center justify-center h-14 rounded-[20px] transition-all
                          ${active 
                            ? 'bg-white/30 backdrop-blur-md' 
                            : 'bg-white/15 backdrop-blur-sm hover:bg-white/25'
                          }
                        `}
                      >
                        <span className="font-sans font-bold text-[18px] tracking-[-0.5px] text-white">
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* Account Section at Bottom */}
            <div className="pb-8">
              {/* Expanded Account Menu */}
              {accountExpanded && (
                <div className="mb-2 px-8">
                  <div className="bg-white/20 backdrop-blur-md rounded-[20px] overflow-hidden">
                    <Link
                      href="/settings"
                      onClick={() => setIsOpen(false)}
                      className="block px-6 py-3 text-center text-white hover:bg-white/10 transition-colors"
                    >
                      <span className="font-sans font-semibold text-[16px]">Settings</span>
                    </Link>
                    <Link
                      href="/referrals"
                      onClick={() => setIsOpen(false)}
                      className="block px-6 py-3 text-center text-white hover:bg-white/10 transition-colors border-t border-white/10"
                    >
                      <span className="font-sans font-semibold text-[16px]">Referrals</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full px-6 py-3 text-center text-white hover:bg-white/10 transition-colors border-t border-white/10"
                    >
                      <span className="font-sans font-semibold text-[16px]">Log out</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Account Toggle */}
              <div className="px-8">
                <button 
                  onClick={() => setAccountExpanded(!accountExpanded)}
                  className="w-full max-w-sm mx-auto flex items-center justify-center h-14 rounded-[20px] bg-white/15 backdrop-blur-sm hover:bg-white/25 transition-all"
                >
                  <span className="font-sans font-semibold text-[16px] text-white mr-2">
                    {user?.name || 'Account'}
                  </span>
                  {accountExpanded ? (
                    <ChevronDownIcon className="w-4 h-4 text-white" strokeWidth={1.5} />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-white" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
