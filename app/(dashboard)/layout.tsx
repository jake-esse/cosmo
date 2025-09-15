'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { VineIcon } from '@/components/icons'

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

const MobileSidebar = dynamic(
  () => import('@/components/layout/MobileSidebar').then(mod => mod.MobileSidebar),
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
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        redirect('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
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

  if (loading || !userInfo) {
    return (
      <div className="h-screen bg-white relative">
        {/* Brand Section - Matching landing page exactly */}
        <div className="absolute left-[20px] top-[9px] h-[47px] z-10">
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
        
        {/* Main Content Area - starts at 238px (9px + 224px + 5px) with reduced gap */}
        <main className="absolute left-[238px] top-0 right-0 bottom-0">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="h-screen bg-white relative">
      {/* Brand Section - Matching landing page exactly */}
      <div className="absolute left-[20px] top-[9px] h-[47px] z-10">
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
      
      {/* Fixed Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:block">
        <FixedSidebar user={userInfo} />
      </div>
      
      {/* Mobile Sidebar - Visible on mobile only */}
      <MobileSidebar user={userInfo} />
      
      {/* Main Content Area - starts at 238px (9px + 224px + 5px) with reduced gap */}
      <main className="absolute left-[238px] top-0 right-0 bottom-0">
        {children}
      </main>
    </div>
  )
}
