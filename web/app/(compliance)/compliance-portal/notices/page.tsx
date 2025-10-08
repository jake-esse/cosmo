import { createClient } from '@/lib/supabase/server'
import { requireComplianceAccess } from '@/lib/compliance/auth'
import Link from 'next/link'
import { Bell, Plus, AlertCircle, Clock, CheckCircle, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

async function getSystemNotices() {
  const supabase = await createClient()

  // First check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error('User not authenticated')
    return []
  }

  const { data, error } = await supabase
    .from('system_notices')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching system notices:', {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    return []
  }

  return data || []
}

async function getNoticeStats(noticeId: string) {
  const supabase = await createClient()

  const { count: totalSent } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('related_notice_id', noticeId)

  const { count: totalRead } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('related_notice_id', noticeId)
    .not('read_at', 'is', null)

  return {
    totalSent: totalSent || 0,
    totalRead: totalRead || 0,
    readRate: totalSent ? Math.round((totalRead || 0) / totalSent * 100) : 0
  }
}

const noticeTypeColors = {
  announcement: 'bg-blue-100 text-blue-800',
  regulatory_update: 'bg-purple-100 text-purple-800',
  maintenance: 'bg-orange-100 text-orange-800',
  security_alert: 'bg-red-100 text-red-800',
  offering_update: 'bg-green-100 text-green-800',
  terms_update: 'bg-yellow-100 text-yellow-800',
  feature_release: 'bg-indigo-100 text-indigo-800'
}

const priorityIcons = {
  low: null,
  normal: null,
  high: AlertCircle,
  critical: AlertCircle
}

const priorityColors = {
  low: 'text-gray-500',
  normal: 'text-gray-600',
  high: 'text-orange-600',
  critical: 'text-red-600'
}

export default async function NoticesPage() {
  const { user, complianceUser } = await requireComplianceAccess()
  const notices = await getSystemNotices()
  const canCreateNotices = ['admin', 'compliance_officer'].includes(complianceUser?.role || '')

  // Get stats for each notice
  const noticesWithStats = await Promise.all(
    notices.map(async (notice) => {
      const stats = await getNoticeStats(notice.id)
      return { ...notice, ...stats }
    })
  )

  const activeNotices = noticesWithStats.filter(n => n.is_published)
  const draftNotices = noticesWithStats.filter(n => !n.is_published && !n.broadcast_at)
  const archivedNotices = noticesWithStats.filter(n => !n.is_published && n.broadcast_at)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            System Notices
          </h1>
          <p className="text-gray-600 mt-1">
            Create and manage platform-wide announcements
          </p>
        </div>
        {canCreateNotices && (
          <div className="mt-4 sm:mt-0">
            <Link href="/compliance-portal/notices/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Notice
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Notice Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Notices</p>
                <p className="text-2xl font-bold mt-1">{activeNotices.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Draft Notices</p>
                <p className="text-2xl font-bold mt-1">{draftNotices.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sent</p>
                <p className="text-2xl font-bold mt-1">
                  {noticesWithStats.reduce((sum, n) => sum + n.totalSent, 0).toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Notices */}
      {activeNotices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Notices</CardTitle>
            <CardDescription>Currently visible to users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeNotices.map((notice) => {
                const PriorityIcon = priorityIcons[notice.priority as keyof typeof priorityIcons]

                return (
                  <div key={notice.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {PriorityIcon && (
                            <PriorityIcon
                              className={`h-4 w-4 ${priorityColors[notice.priority as keyof typeof priorityColors]}`}
                            />
                          )}
                          <h3 className="font-semibold text-gray-900">{notice.title}</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{notice.content}</p>
                        <div className="flex items-center gap-4 text-xs">
                          <Badge
                            variant="secondary"
                            className={noticeTypeColors[notice.notice_type as keyof typeof noticeTypeColors]}
                          >
                            {notice.notice_type.replace('_', ' ')}
                          </Badge>
                          <span className="text-gray-500">
                            Broadcast: {new Date(notice.broadcast_at).toLocaleDateString()}
                          </span>
                          <span className="text-gray-500">
                            Sent to: {notice.totalSent.toLocaleString()} users
                          </span>
                          <span className="text-gray-500">
                            Read rate: {notice.readRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Draft Notices */}
      {draftNotices.length > 0 && canCreateNotices && (
        <Card>
          <CardHeader>
            <CardTitle>Draft Notices</CardTitle>
            <CardDescription>Not yet broadcast</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {draftNotices.map((notice) => {
                const PriorityIcon = priorityIcons[notice.priority as keyof typeof priorityIcons]

                return (
                  <div key={notice.id} className="border rounded-lg p-4 opacity-75">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {PriorityIcon && (
                            <PriorityIcon
                              className={`h-4 w-4 ${priorityColors[notice.priority as keyof typeof priorityColors]}`}
                            />
                          )}
                          <h3 className="font-semibold text-gray-900">{notice.title}</h3>
                          <Badge variant="outline" className="text-xs">Draft</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{notice.content}</p>
                        <div className="flex items-center gap-4 text-xs">
                          <Badge
                            variant="secondary"
                            className={noticeTypeColors[notice.notice_type as keyof typeof noticeTypeColors]}
                          >
                            {notice.notice_type.replace('_', ' ')}
                          </Badge>
                          <span className="text-gray-500">
                            Created: {new Date(notice.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Broadcast
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Archived Notices */}
      {archivedNotices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Archived Notices</CardTitle>
            <CardDescription>Previously broadcast, now inactive</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {archivedNotices.slice(0, 5).map((notice) => (
                <div key={notice.id} className="border rounded-lg p-4 opacity-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{notice.title}</h3>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          Broadcast: {new Date(notice.broadcast_at).toLocaleDateString()}
                        </span>
                        <span>
                          Sent to: {notice.totalSent.toLocaleString()} users
                        </span>
                        <span>
                          Read rate: {notice.readRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {notices.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No notices yet</h3>
            <p className="text-sm text-gray-600 mb-4">
              Create your first system notice to communicate with users
            </p>
            {canCreateNotices && (
              <Link href="/compliance-portal/notices/new">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Notice
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}