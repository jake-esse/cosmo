'use client'

import { PageLayout } from '@/components/layout/PageLayout'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Clock, Trash2 } from 'lucide-react'

interface Conversation {
  id: string
  title: string
  last_message_at: string
  model?: string
}

export default function ChatHistoryPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllConversations()
  }, [])

  const fetchAllConversations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/conversations/list?limit=100')
      if (response.ok) {
        const { conversations } = await response.json()
        setConversations(conversations)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConversationClick = (id: string) => {
    router.push(`/chat/${id}`)
  }

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // Prevent navigation
    
    if (confirm('Are you sure you want to delete this conversation?')) {
      try {
        const response = await fetch(`/api/conversations/${id}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          setConversations(prev => prev.filter(c => c.id !== id))
        }
      } catch (error) {
        console.error('Error deleting conversation:', error)
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / 86400000)
    
    if (days === 0) {
      return 'Today'
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return `${days} days ago`
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  return (
    <PageLayout pageName="Chat History">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="font-brand text-heading-lg text-slate-900 mb-2">All Conversations</h1>
          <p className="font-sans text-body-md text-slate-600">
            Browse and manage your chat history
          </p>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-[#DFECC6]/20 rounded-[20px] h-24"></div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16 bg-[#DFECC6]/20 rounded-[30px] border border-[#DFECC6]/40">
            <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="font-sans text-body-lg text-slate-700 mb-2">No conversations yet</p>
            <p className="font-sans text-body-sm text-slate-500 mb-6">
              Start a new chat to begin exploring
            </p>
            <button
              onClick={() => router.push('/chat')}
              className="px-6 py-3 bg-[#485C11] text-white rounded-[1000px] hover:bg-[#485C11]/90 transition-all font-sans font-semibold shadow-sm"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleConversationClick(conversation.id)}
                className="bg-white rounded-[20px] border border-[#B0C4C9]/40 p-6 hover:shadow-md hover:border-[#DFECC6] transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-sans font-semibold text-slate-900 truncate text-lg">
                      {conversation.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1.5 font-sans text-body-sm text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(conversation.last_message_at)}
                      </span>
                      {conversation.model && (
                        <span className="font-sans text-label-sm bg-[#DFECC6]/30 text-slate-700 px-3 py-1 rounded-[1000px]">
                          {conversation.model}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conversation.id)}
                    className="opacity-0 group-hover:opacity-100 p-2.5 hover:bg-red-50 rounded-[20px] transition-all ml-4"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}