'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestBroadcastPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<unknown[]>([])

  const addResult = (label: string, data: unknown) => {
    setResults(prev => [...prev, { label, data, timestamp: new Date().toISOString() }])
  }

  const testBroadcast = async () => {
    setLoading(true)
    setResults([])

    const supabase = createClient()

    try {
      // First check auth
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      addResult('Auth Check', { user: user?.id, error: authError })

      // Check portal account
      const { data: portalAccount, error: portalError } = await supabase
        .from('portal_accounts')
        .select('*')
        .eq('auth_user_id', user?.id || '')
        .single()

      addResult('Portal Account', { account: portalAccount, error: portalError })

      // Check profiles count
      const { count: profileCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      addResult('Profile Count', { count: profileCount })

      // Test admin_broadcast_notice
      addResult('Calling admin_broadcast_notice...', { status: 'starting' })

      // Try with explicit typing
      const adminParams = {
        p_title: 'Test Admin Broadcast',
        p_content: 'Testing admin broadcast function',
        p_notice_type: 'announcement',
        p_priority: 'normal',
        p_target_audience: 'all'
      }

      addResult('Admin params', adminParams)

      const { data: adminData, error: adminError } = await supabase.rpc('admin_broadcast_notice', adminParams)

      addResult('admin_broadcast_notice Result', {
        data: adminData,
        error: adminError,
        errorString: adminError ? JSON.stringify(adminError) : null,
        errorMessage: adminError?.message,
        errorCode: adminError?.code,
        errorDetails: adminError?.details,
        errorHint: adminError?.hint
      })

      // Test regular broadcast_system_notice
      addResult('Calling broadcast_system_notice...', { status: 'starting' })

      const { data: broadcastData, error: broadcastError } = await supabase.rpc('broadcast_system_notice', {
        p_title: 'Test Regular Broadcast',
        p_content: 'Testing regular broadcast function',
        p_notice_type: 'announcement',
        p_priority: 'normal',
        p_target_audience: 'all'
      })

      addResult('broadcast_system_notice Result', {
        data: broadcastData,
        error: broadcastError,
        errorString: broadcastError ? JSON.stringify(broadcastError) : null,
        errorMessage: broadcastError?.message,
        errorCode: broadcastError?.code,
        errorDetails: broadcastError?.details,
        errorHint: broadcastError?.hint
      })

      // Check if notices were created
      const { data: notices, count: noticeCount } = await supabase
        .from('system_notices')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5)

      addResult('Recent System Notices', { notices, count: noticeCount })

      // Test the simplified function
      addResult('Calling simple_broadcast_test...', { status: 'starting' })

      const { data: simpleData, error: simpleError } = await supabase.rpc('simple_broadcast_test', {
        p_title: 'Simple Test Broadcast',
        p_content: 'Testing simplified broadcast function'
      })

      addResult('simple_broadcast_test Result', {
        data: simpleData,
        error: simpleError,
        errorString: simpleError ? JSON.stringify(simpleError) : null
      })

      // Check if user notifications were created
      const { data: notifications, count: notificationCount } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5)

      addResult('Recent User Notifications', { notifications, count: notificationCount })

    } catch (error: unknown) {
      addResult('Unexpected Error', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Broadcast Functions</CardTitle>
          <CardDescription>
            Debug the notification broadcast system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={testBroadcast}
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Run Test'}
          </Button>

          {results.length > 0 && (
            <div className="space-y-4">
              {results.map((result, idx) => (
                <div key={idx} className="border rounded p-3">
                  <h4 className="font-semibold text-sm">{result.label}</h4>
                  <pre className="text-xs mt-2 overflow-x-auto bg-gray-50 p-2 rounded">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}