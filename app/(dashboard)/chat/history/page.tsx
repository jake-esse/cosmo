'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageLayout } from '@/components/layout/PageLayout'
import Link from 'next/link'
import { MessageSquare, Clock, ChevronRight } from 'lucide-react'

interface Conversation {
  id: string
  title: string
  model: string
  created_at: string
  updated_at: string
  message_count: number
  last_message?: string
}

export default function ChatHistoryPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadConversations()
  }, [])

  async function loadConversations() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get all conversations with message count
      const { data: convData, error } = await supabase
        .from('conversations')
        .select(`
          id,
          title,
          model,
          created_at,
          updated_at,
          messages (
            id,
            content,
            role
          )
        `)
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error loading conversations:', error)
        return
      }

      // Format conversations with message count and last message
      const formattedConversations = convData?.map(conv => {
        const messages = conv.messages || []
        const lastUserMessage = messages
          .filter((m: any) => m.role === 'user')
          .sort((a: any, b: any) => b.id.localeCompare(a.id))[0]

        return {
          id: conv.id,
          title: conv.title || 'New Chat',
          model: conv.model || 'Unknown',
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          message_count: messages.length,
          last_message: lastUserMessage?.content || ''
        }
      }) || []

      setConversations(formattedConversations)
    } catch (error) {
      console.error('Error in loadConversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours)
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24)
      return `${days} ${days === 1 ? 'day' : 'days'} ago`
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  const getModelBadgeColor = (model: string) => {
    if (model.includes('gpt-4')) return 'bg-purple-100 text-purple-700'
    if (model.includes('claude')) return 'bg-blue-100 text-blue-700'
    if (model.includes('gemini')) return 'bg-green-100 text-green-700'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <PageLayout pageName="Chat History">
      <div className="p-4 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-transparent"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-700 mb-2">No conversations yet</p>
            <p className="text-sm text-slate-500 mb-6">Start a chat to see your history here</p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Start New Chat</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                className="block bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900 truncate">
                        {conv.title}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getModelBadgeColor(conv.model)}`}>
                        {conv.model.split('-').slice(0, 2).join('-')}
                      </span>
                    </div>
                    {conv.last_message && (
                      <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                        {conv.last_message}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {conv.message_count} messages
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(conv.updated_at)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
