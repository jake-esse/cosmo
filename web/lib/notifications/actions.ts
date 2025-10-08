'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markNotificationAsRead(notificationId: string) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase.rpc('mark_notifications_read', {
    p_notification_ids: [notificationId]
  })

  if (error) throw error

  revalidatePath('/notifications')
  return { success: true, count: data }
}

export async function markAllNotificationsAsRead() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase.rpc('mark_all_notifications_read')

  if (error) throw error

  revalidatePath('/notifications')
  return { success: true, count: data }
}

export async function dismissNotification(notificationId: string) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase.rpc('dismiss_notifications', {
    p_notification_ids: [notificationId]
  })

  if (error) throw error

  revalidatePath('/notifications')
  return { success: true, count: data }
}

export async function getNotificationCount() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase.rpc('get_unread_notification_count')

  if (error) {
    console.error('Error getting notification count:', error)
    return null
  }

  return data?.[0] || null
}

export async function getUserNotifications(
  limit: number = 20,
  offset: number = 0,
  includeRead: boolean = true,
  includeDismissed: boolean = false
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase.rpc('get_user_notifications', {
    p_limit: limit,
    p_offset: offset,
    p_include_read: includeRead,
    p_include_dismissed: includeDismissed
  })

  if (error) throw error

  return data
}

// Admin function to broadcast a system notice
export async function broadcastSystemNotice(
  title: string,
  content: string,
  noticeType: 'announcement' | 'regulatory_update' | 'maintenance' | 'security_alert' | 'offering_update' | 'terms_update' | 'feature_release' = 'announcement',
  priority: 'critical' | 'high' | 'normal' | 'low' = 'normal',
  metadata?: Record<string, unknown>
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Check if user is admin (you might want to add proper admin check here)
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    throw new Error('Unauthorized - Admin access required')
  }

  const { data, error } = await supabase.rpc('broadcast_system_notice', {
    p_title: title,
    p_content: content,
    p_notice_type: noticeType,
    p_priority: priority,
    p_metadata: metadata || {}
  })

  if (error) throw error

  return { success: true, noticeId: data }
}