'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageSquare, Store, Wallet, Settings, Users, Shield, PieChart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardSidebarProps {
  isAdmin?: boolean
}

export default function DashboardSidebar({ isAdmin = false }: DashboardSidebarProps) {
  const pathname = usePathname()
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Chat', href: '/dashboard/chat', icon: MessageSquare },
    { name: 'Apps', href: '/dashboard/apps', icon: Store },
    { name: 'Referrals', href: '/referrals', icon: Users },
    { name: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
    { name: 'Shares', href: '/dashboard/shares', icon: PieChart },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]
  
  // Add admin link if user is admin
  if (isAdmin) {
    navigation.push({ 
      name: 'Admin', 
      href: '/admin/referrals', 
      icon: Shield 
    })
  }

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
        <div className="h-16 shrink-0 relative">
          <h1 className="absolute left-0 top-1/2 -translate-y-1/2 mt-[2px] font-sans font-medium text-[26px] text-gray-900 tracking-[-1.5px]">Ampel</h1>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        pathname === item.href
                          ? 'bg-gray-50 text-blue-600'
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50',
                        'group flex gap-x-3 rounded-md p-2 text-label-lg'
                      )}
                    >
                      <item.icon
                        className={cn(
                          pathname === item.href ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600',
                          'h-5 w-5 shrink-0'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}