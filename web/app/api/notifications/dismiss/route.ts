import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get notification IDs from request body
    const body = await request.json()
    const { notificationIds } = body

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Dismiss notifications
    const { data, error } = await supabase.rpc('dismiss_notifications', {
      p_notification_ids: notificationIds
    })

    if (error) {
      console.error('Error dismissing notifications:', error)
      return NextResponse.json(
        { error: 'Failed to dismiss notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: data
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}