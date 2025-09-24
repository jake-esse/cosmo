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
    // All models use the same dark green color scheme
    return 'bg-[#2A341D] text-white border-[#2A341D]'
  }

  const getModelDisplayName = (model: string) => {
    const modelMap: Record<string, string> = {
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'claude-3.5-sonnet': 'Claude 3.5',
      'claude-3-haiku': 'Claude 3',
      'gemini-2.5-flash-lite': 'Gemini',
      'gemini-2.0-flash': 'Gemini 2.0',
      'llama-3.1-70b': 'Llama 3.1'
    }
    return modelMap[model] || model.split('-').slice(0, 2).join('-')
  }

  return (
    <PageLayout pageName="Chat History">
      <div className="p-6 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-transparent"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-heading-md font-brand text-slate-900 mb-2">No conversations yet</p>
            <p className="text-body-md text-slate-600 mb-6 font-sans">Start a chat to see your history here</p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2A341D] text-white rounded-[12px] hover:bg-[#1F2816] transition-colors font-sans font-medium text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Start New Chat</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mb-6">
              <h2 className="text-heading-sm font-brand text-slate-900 mb-1">Your Conversations</h2>
              <p className="text-body-sm font-sans text-slate-600">{conversations.length} chat{conversations.length !== 1 ? 's' : ''} in history</p>
            </div>

            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                className="block bg-white border border-slate-200 rounded-[20px] p-5 hover:shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)] hover:border-slate-300 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-brand text-lg text-slate-900 truncate group-hover:text-[#2A341D] transition-colors">
                        {conv.title}
                      </h3>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getModelBadgeColor(conv.model)}`}>
                        {getModelDisplayName(conv.model)}
                      </span>
                    </div>
                    {conv.last_message && (
                      <p className="text-body-sm font-sans text-slate-600 line-clamp-2 mb-3">
                        {conv.last_message}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-label-sm font-sans text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {conv.message_count} message{conv.message_count !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(conv.updated_at)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-2 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
