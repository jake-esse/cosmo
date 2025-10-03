import { createClient } from '@/lib/supabase/server'
import { requireComplianceAccess } from '@/lib/compliance/auth'
import {
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

async function getAnalyticsData() {
  const supabase = await createClient()

  // Get user growth data
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: userGrowth } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true })

  // Get referral metrics
  const { data: referralData } = await supabase
    .from('referrals')
    .select('status, created_at')
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Get notification metrics
  const { data: notificationData } = await supabase
    .from('user_notifications')
    .select('read_at, priority, created_at')
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Get equity transaction metrics
  const { data: equityData } = await supabase
    .from('equity_transactions')
    .select('amount, transaction_type, created_at')
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Process data for charts
  const dailySignups = processDaily(userGrowth || [], 'created_at')
  const referralMetrics = {
    completed: referralData?.filter(r => r.status === 'completed').length || 0,
    pending: referralData?.filter(r => r.status === 'pending').length || 0,
    failed: referralData?.filter(r => r.status === 'failed').length || 0
  }

  const notificationMetrics = {
    total: notificationData?.length || 0,
    read: notificationData?.filter(n => n.read_at).length || 0,
    unread: notificationData?.filter(n => !n.read_at).length || 0,
    critical: notificationData?.filter(n => n.priority === 'critical').length || 0,
    high: notificationData?.filter(n => n.priority === 'high').length || 0
  }

  const equityMetrics = {
    totalIssued: equityData?.filter(e => e.transaction_type === 'credit').reduce((sum, e) => sum + Number(e.amount), 0) || 0,
    totalDebited: equityData?.filter(e => e.transaction_type === 'debit').reduce((sum, e) => sum + Number(e.amount), 0) || 0,
    transactions: equityData?.length || 0
  }

  return {
    dailySignups,
    referralMetrics,
    notificationMetrics,
    equityMetrics,
    userGrowth: userGrowth?.length || 0
  }
}

function processDaily(data: unknown[], dateField: string) {
  const dailyMap: Record<string, number> = {}

  data.forEach(item => {
    const date = new Date(item[dateField]).toLocaleDateString()
    dailyMap[date] = (dailyMap[date] || 0) + 1
  })

  return Object.entries(dailyMap).map(([date, count]) => ({ date, count }))
}

export default async function AnalyticsPage() {
  const { user, complianceUser } = await requireComplianceAccess()
  const analytics = await getAnalyticsData()

  const readRate = analytics.notificationMetrics.total > 0
    ? Math.round((analytics.notificationMetrics.read / analytics.notificationMetrics.total) * 100)
    : 0

  const referralSuccessRate = (analytics.referralMetrics.completed + analytics.referralMetrics.pending + analytics.referralMetrics.failed) > 0
    ? Math.round((analytics.referralMetrics.completed / (analytics.referralMetrics.completed + analytics.referralMetrics.pending + analytics.referralMetrics.failed)) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          Compliance Analytics
        </h1>
        <p className="text-gray-600 mt-1">
          Platform metrics and regulatory insights
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">User Growth</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.userGrowth}</div>
            <p className="text-xs text-gray-500 mt-1">New users (30 days)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Referral Success</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralSuccessRate}%</div>
            <p className="text-xs text-gray-500 mt-1">
              {analytics.referralMetrics.completed} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Notice Read Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readRate}%</div>
            <p className="text-xs text-gray-500 mt-1">
              {analytics.notificationMetrics.read} of {analytics.notificationMetrics.total}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Equity Issued</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.equityMetrics.totalIssued.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Points (30 days)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              Daily Signups
            </CardTitle>
            <CardDescription>User registration trends over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.dailySignups.length > 0 ? (
              <div className="space-y-2">
                <div className="h-[200px] flex items-end gap-1">
                  {analytics.dailySignups.slice(-14).map((day, index) => {
                    const maxCount = Math.max(...analytics.dailySignups.map(d => d.count))
                    const height = (day.count / maxCount) * 100

                    return (
                      <div
                        key={index}
                        className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors group relative"
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {day.count} signups
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-500 text-center">Last 14 days</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No signup data available</p>
            )}
          </CardContent>
        </Card>

        {/* Referral Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              Referral Performance
            </CardTitle>
            <CardDescription>Referral status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Completed</span>
                  <span className="font-medium">{analytics.referralMetrics.completed}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${(analytics.referralMetrics.completed / (analytics.referralMetrics.completed + analytics.referralMetrics.pending + analytics.referralMetrics.failed)) * 100}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Pending</span>
                  <span className="font-medium">{analytics.referralMetrics.pending}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{
                      width: `${(analytics.referralMetrics.pending / (analytics.referralMetrics.completed + analytics.referralMetrics.pending + analytics.referralMetrics.failed)) * 100}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Failed</span>
                  <span className="font-medium">{analytics.referralMetrics.failed}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{
                      width: `${(analytics.referralMetrics.failed / (analytics.referralMetrics.completed + analytics.referralMetrics.pending + analytics.referralMetrics.failed)) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-gray-400" />
              Notification Insights
            </CardTitle>
            <CardDescription>Notification delivery and engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {analytics.notificationMetrics.read}
                  </p>
                  <p className="text-xs text-gray-500">Read</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-400">
                    {analytics.notificationMetrics.unread}
                  </p>
                  <p className="text-xs text-gray-500">Unread</p>
                </div>
              </div>

              <div className="pt-3 border-t">
                <p className="text-sm text-gray-600 mb-2">Priority Breakdown</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Critical</span>
                    <span className="font-medium text-red-600">
                      {analytics.notificationMetrics.critical}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>High</span>
                    <span className="font-medium text-orange-600">
                      {analytics.notificationMetrics.high}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Normal</span>
                    <span className="font-medium">
                      {analytics.notificationMetrics.total - analytics.notificationMetrics.critical - analytics.notificationMetrics.high}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              Equity Activity
            </CardTitle>
            <CardDescription>Point issuance and transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Issued</p>
                  <p className="text-xl font-bold text-green-600">
                    +{analytics.equityMetrics.totalIssued.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Debited</p>
                  <p className="text-xl font-bold text-red-600">
                    -{analytics.equityMetrics.totalDebited.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Transactions</span>
                  <span className="font-medium">{analytics.equityMetrics.transactions}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-600">Avg per Transaction</span>
                  <span className="font-medium">
                    {analytics.equityMetrics.transactions > 0
                      ? Math.round(analytics.equityMetrics.totalIssued / analytics.equityMetrics.transactions)
                      : 0}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Analytics data is refreshed every hour. For real-time metrics, please check individual sections.
        </AlertDescription>
      </Alert>
    </div>
  )
}