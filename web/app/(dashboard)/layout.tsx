'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { VineIcon } from '@/components/icons'
import { NotificationProvider } from '@/components/notifications/NotificationProvider'
import { Toaster } from '@/components/ui/sonner'

// Dynamically import sidebars to avoid SSR hydration issues
const FixedSidebar = dynamic(
  () => import('@/components/layout/FixedSidebar').then(mod => mod.FixedSidebar),
  { 
    ssr: false,
    loading: () => (
      <aside className="absolute left-[9px] top-[62px] bottom-[11px] w-[224px] rounded-[30px] bg-gray-100 animate-pulse" />
    )
  }
)

const MobileMenu = dynamic(
  () => import('@/components/layout/MobileMenu').then(mod => mod.MobileMenu),
  { 
    ssr: false,
    loading: () => null
  }
)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [userInfo, setUserInfo] = useState<{
    name: string
    email: string
    initials: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()

      // Parallelize user auth and profile fetch for better performance
      const [{ data: { user } }, profileResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('profiles').select('display_name').single()
      ])

      if (!user) {
        redirect('/login')
        return
      }

      const profile = profileResult.data

      // Get user initials from display name
      const displayName = profile?.display_name || user.email?.split('@')[0] || 'User'
      const initials = displayName
        .split(' ')
        .map((word: string) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

      setUserInfo({
        name: displayName,
        email: user.email || '',
        initials: initials
      })
      setLoading(false)
    }

    loadUser()
  }, [])

  return (
    <NotificationProvider>
      <div className="h-screen bg-white relative md:block">
        {/* Brand Section Desktop - Hidden on mobile */}
        <div className="hidden md:block absolute left-[20px] top-[9px] h-[47px] z-10">
          <div className="relative h-full">
            {/* Logo */}
            <div className="absolute left-0 top-[8px] w-[32px] h-[31px] flex items-center justify-center">
              <VineIcon className="w-full h-full text-black" />
            </div>
            {/* Ampel text - desktop size */}
            <span className="absolute left-[30px] top-1/2 -translate-y-1/2 mt-[2px] font-sans font-medium text-[26px] text-black tracking-[-1.5px]">
              Ampel
            </span>
          </div>
        </div>

        {/* Fixed Desktop Sidebar - Hidden on mobile, show skeleton while loading */}
        <div className="hidden md:block">
          {loading || !userInfo ? (
            <aside className="absolute left-[9px] top-[62px] bottom-[11px] w-[224px] rounded-[30px] bg-gray-100 animate-pulse" />
          ) : (
            <FixedSidebar user={userInfo} />
          )}
        </div>

        {/* Mobile Menu - Visible on mobile only */}
        <MobileMenu user={userInfo} />

        {/* Main Content Area - Responsive positioning */}
        <main className="md:absolute md:left-[238px] md:top-0 md:right-0 md:bottom-0 w-full md:w-auto h-full overflow-hidden">
          {children}
        </main>

        <Toaster position="top-right" />
      </div>
    </NotificationProvider>
  )
}
