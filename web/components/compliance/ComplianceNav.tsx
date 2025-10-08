'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Bell,
  FileDown,
  BarChart3,
  Settings,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ComplianceUser } from '@/lib/compliance/auth'

interface ComplianceNavProps {
  user: ComplianceUser
}

const navigation = [
  { name: 'Dashboard', href: '/compliance-portal', icon: LayoutDashboard },
  { name: 'Notices', href: '/compliance-portal/notices', icon: Bell },
  { name: 'Exports', href: '/compliance-portal/exports', icon: FileDown },
  { name: 'Analytics', href: '/compliance-portal/analytics', icon: BarChart3 },
]

export function ComplianceNav({ user }: ComplianceNavProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const isActive = (href: string) => {
    if (href === '/compliance-portal') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  // Filter navigation based on user role
  const availableNavigation = navigation.filter(item => {
    if (user.role === 'admin' || user.role === 'compliance_officer') {
      return true // All access
    }
    if (user.role === 'auditor') {
      return item.name !== 'Notices' || item.href === '/compliance-portal/notices' // Can view but not create notices
    }
    if (user.role === 'viewer') {
      return item.name === 'Dashboard' || item.name === 'Analytics' // Limited access
    }
    return false
  })

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-14 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-white"
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-40px)]">
        <nav className="px-4 py-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Compliance Portal</h2>
            <p className="text-sm text-gray-500 mt-1">{user.full_name}</p>
          </div>

          <ul className="space-y-1">
            {availableNavigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Role Badge */}
          <div className="mt-8 px-3">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {user.role.replace('_', ' ').toUpperCase()}
            </div>
          </div>
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Sidebar */}
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 z-50">
            <nav className="px-4 py-6 pt-20">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Compliance Portal</h2>
                <p className="text-sm text-gray-500 mt-1">{user.full_name}</p>
              </div>

              <ul className="space-y-1">
                {availableNavigation.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)

                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          active
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>

              {/* Role Badge */}
              <div className="mt-8 px-3">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {user.role.replace('_', ' ').toUpperCase()}
                </div>
              </div>
            </nav>
          </aside>
        </div>
      )}
    </>
  )
}