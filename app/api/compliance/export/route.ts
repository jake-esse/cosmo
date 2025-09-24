import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { export_id, export_type, date_range } = await req.json()

    if (!export_id || !export_type) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify the user has access to this export
    const { data: exportRecord, error: exportError } = await supabase
      .from('compliance_exports')
      .select('*')
      .eq('id', export_id)
      .single()

    if (exportError || !exportRecord) {
      return NextResponse.json(
        { error: 'Export record not found' },
        { status: 404 }
      )
    }

    // Calculate date filter
    let dateFilter: Date | null = null
    const now = new Date()

    switch (date_range) {
      case '7d':
        dateFilter = new Date(now.setDate(now.getDate() - 7))
        break
      case '30d':
        dateFilter = new Date(now.setDate(now.getDate() - 30))
        break
      case '90d':
        dateFilter = new Date(now.setDate(now.getDate() - 90))
        break
      case '1y':
        dateFilter = new Date(now.setFullYear(now.getFullYear() - 1))
        break
      case 'all':
      default:
        dateFilter = null
    }

    let data: any[] = []
    let headers: string[] = []

    // Query based on export type
    switch (export_type) {
      case 'user_profiles':
        headers = ['ID', 'Display Name', 'Created At', 'Education Completed', 'Terms Accepted']
        let profileQuery = supabase
          .from('profiles')
          .select('id, display_name, created_at, education_completed_at, terms_accepted_at')
          .order('created_at', { ascending: false })

        if (dateFilter) {
          profileQuery = profileQuery.gte('created_at', dateFilter.toISOString())
        }

        const { data: profiles } = await profileQuery
        data = profiles || []
        break

      case 'equity_transactions':
        headers = ['User ID', 'Amount', 'Transaction Type', 'Balance After', 'Created At']
        let equityQuery = supabase
          .from('equity_transactions')
          .select('user_id, amount, transaction_type, balance_after, created_at')
          .order('created_at', { ascending: false })

        if (dateFilter) {
          equityQuery = equityQuery.gte('created_at', dateFilter.toISOString())
        }

        const { data: transactions } = await equityQuery
        data = transactions || []
        break

      case 'referrals':
        headers = ['Referrer ID', 'Referred ID', 'Status', 'Created At']
        let referralQuery = supabase
          .from('referrals')
          .select('referrer_id, referred_id, status, created_at')
          .order('created_at', { ascending: false })

        if (dateFilter) {
          referralQuery = referralQuery.gte('created_at', dateFilter.toISOString())
        }

        const { data: referrals } = await referralQuery
        data = referrals || []
        break

      case 'audit_logs':
        headers = ['Table Name', 'Operation', 'User ID', 'Created At']
        let auditQuery = supabase
          .from('audit_logs')
          .select('table_name, operation, user_id, created_at')
          .order('created_at', { ascending: false })

        if (dateFilter) {
          auditQuery = auditQuery.gte('created_at', dateFilter.toISOString())
        }

        const { data: logs } = await auditQuery
        data = logs || []
        break

      case 'notifications':
        headers = ['User ID', 'Title', 'Notice Type', 'Read At', 'Created At']
        let notificationQuery = supabase
          .from('user_notifications')
          .select('user_id, title, notification_type, read_at, created_at')
          .order('created_at', { ascending: false })

        if (dateFilter) {
          notificationQuery = notificationQuery.gte('created_at', dateFilter.toISOString())
        }

        const { data: notifications } = await notificationQuery
        // Map notification_type to title for the CSV
        data = (notifications || []).map(n => ({
          user_id: n.user_id,
          title: n.title,
          notice_type: n.notification_type,
          read_at: n.read_at,
          created_at: n.created_at
        }))
        break

      default:
        return NextResponse.json(
          { error: 'Invalid export type' },
          { status: 400 }
        )
    }

    // Convert to CSV
    const csvRows: string[] = []

    // Add headers
    csvRows.push(headers.join(','))

    // Add data rows
    for (const row of data) {
      const values = Object.values(row).map(value => {
        // Handle null/undefined
        if (value === null || value === undefined) {
          return ''
        }

        // Convert to string and escape if needed
        const str = String(value)

        // If contains comma, newline, or quotes, wrap in quotes and escape internal quotes
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`
        }

        return str
      })

      csvRows.push(values.join(','))
    }

    const csvContent = csvRows.join('\n')
    const recordCount = data.length

    // Update the export record
    await supabase
      .from('compliance_exports')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        record_count: recordCount
      })
      .eq('id', export_id)

    // Create filename
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `export-${export_type}-${dateStr}.csv`

    // Return CSV response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    )
  }
}