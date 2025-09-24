export function getNotificationTypeColor(type: string): string {
  const typeColors: Record<string, string> = {
    regulatory: 'text-purple-600',
    compliance: 'text-blue-600',
    security: 'text-red-600',
    feature: 'text-green-600',
    announcement: 'text-sky-600',
    system: 'text-gray-600',
    promotion: 'text-yellow-600'
  }
  return typeColors[type] || 'text-gray-600'
}

export function getNotificationPriorityIcon(priority: string) {
  switch (priority) {
    case 'critical':
      return '🚨'
    case 'high':
      return '⚠️'
    case 'normal':
      return 'ℹ️'
    case 'low':
      return '💡'
    default:
      return '📢'
  }
}

export function formatNotificationDate(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) {
    return 'just now'
  } else if (minutes < 60) {
    return `${minutes}m ago`
  } else if (hours < 24) {
    return `${hours}h ago`
  } else if (days < 7) {
    return `${days}d ago`
  } else {
    return d.toLocaleDateString()
  }
}

export function groupNotificationsByDate(notifications: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {}
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  notifications.forEach(notification => {
    const date = new Date(notification.created_at)
    let group: string

    if (date >= today) {
      group = 'Today'
    } else if (date >= yesterday) {
      group = 'Yesterday'
    } else if (date >= weekAgo) {
      group = 'This Week'
    } else {
      group = 'Older'
    }

    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(notification)
  })

  return groups
}

export function sortNotificationsByPriority(notifications: any[]): any[] {
  const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 }

  return notifications.sort((a, b) => {
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 99
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 99

    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }

    // If priority is the same, sort by date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}