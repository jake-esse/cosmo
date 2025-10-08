import { createClient } from '@/lib/supabase/server'
import { requireComplianceAccess } from '@/lib/compliance/auth'
import Link from 'next/link'
import {
  Shield,
  Users,
  Bell,
  FileDown,
  BarChart3,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

async function getComplianceMetrics() {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_compliance_metrics')

  if (error) {
    console.error('Error fetching compliance metrics:', error)
    // Fallback to direct queries
    const [
      { count: totalUsers },
      { count: notificationsThisWeek },
      { count: recentExports }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('compliance_exports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    ])

    return {
      total_users: totalUsers || 0,
      active_participants: 0,
      notifications_this_week: notificationsThisWeek || 0,
      recent_exports: recentExports || 0,
      unread_notifications: 0,
      critical_notices: 0
    }
  }

  return data?.[0] || {
    total_users: 0,
    active_participants: 0,
    notifications_this_week: 0,
    recent_exports: 0,
    unread_notifications: 0,
    critical_notices: 0
  }
}

async function getRecentActivity() {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_recent_compliance_activity', { p_limit: 5 })

  if (error) {
    console.error('Error fetching recent activity:', error)
    // Fallback to direct query
    const { data: auditData } = await supabase
      .from('compliance_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    return auditData?.map(log => ({
      id: log.id,
      activity_type: log.action_type,
      description: `${log.action_type.replace('_', ' ')}`,
      created_at: log.created_at,
      metadata: log.action_details
    })) || []
  }

  return data || []
}

export default async function ComplianceDashboard() {
  const { user, complianceUser } = await requireComplianceAccess()
  const metrics = await getComplianceMetrics()
  const recentActivity = await getRecentActivity()

  const canCreateNotices = ['admin', 'compliance_officer'].includes(complianceUser?.role || '')
  const canExportData = ['admin', 'compliance_officer', 'auditor'].includes(complianceUser?.role || '')

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Compliance Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Regulatory administration and monitoring
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          {canCreateNotices && (
            <Link href="/compliance-portal/notices/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Bell className="h-4 w-4 mr-2" />
                Create Notice
              </Button>
            </Link>
          )}
          {canExportData && (
            <Link href="/compliance-portal/exports">
              <Button variant="outline">
                <FileDown className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_users.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Registered accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.active_participants.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Notifications</CardTitle>
              <Bell className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.notifications_this_week.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Sent this week</p>
            {metrics.critical_notices > 0 && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {metrics.critical_notices} critical
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Recent Exports</CardTitle>
              <FileDown className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.recent_exports.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest compliance portal actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common compliance tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {canCreateNotices && (
              <Link href="/compliance-portal/notices/new" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Bell className="h-4 w-4 mr-2" />
                  Create System Notice
                </Button>
              </Link>
            )}

            {canExportData && (
              <Link href="/compliance-portal/exports" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FileDown className="h-4 w-4 mr-2" />
                  Export Compliance Data
                </Button>
              </Link>
            )}

            <Link href="/compliance-portal/analytics" className="block">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </Link>

            <Link href="/compliance-portal/notices" className="block">
              <Button variant="outline" className="w-full justify-start">
                <AlertCircle className="h-4 w-4 mr-2" />
                Manage Notices
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Unread Notifications Alert */}
      {metrics.unread_notifications > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-gray-900">
                  {metrics.unread_notifications} unread notifications
                </p>
                <p className="text-sm text-gray-600">
                  Users have notifications pending review
                </p>
              </div>
            </div>
            <Link href="/compliance-portal/notices">
              <Button variant="outline" size="sm">
                Review
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}