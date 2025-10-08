'use client'

import { PageLayout } from '@/components/layout/PageLayout'
import { NotificationTable } from '@/components/notifications/NotificationTable'
import { useNotifications } from '@/components/notifications/NotificationProvider'
import { Bell, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotificationsPage() {
  const { unreadCount, markAllAsRead } = useNotifications()

  const handleMarkAllRead = async () => {
    await markAllAsRead()
  }

  return (
    <PageLayout pageName="Notifications">
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600">
                Stay updated with important announcements and alerts
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark all as read
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {unreadCount > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card-section">
              <div className="flex items-center justify-between mb-1">
                <Bell className="h-4 w-4 text-sky-500" />
                <span className="text-xs text-gray-500">Unread</span>
              </div>
              <p className="text-2xl font-bold text-black">{unreadCount}</p>
              <p className="text-sm text-gray-600">New messages</p>
            </div>
          </div>
        )}

        {/* Notifications Table */}
        <div className="card-base p-0">
          <NotificationTable />
        </div>
      </div>
    </PageLayout>
  )
}