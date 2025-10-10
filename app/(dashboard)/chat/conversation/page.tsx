'use client'

import { ChatInterface } from '@/components/chat/ChatInterface'
import { PageLayout } from '@/components/layout/PageLayout'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useNavigation } from '@/components/layout/NavigationContext'
import { getApiUrl } from '@/lib/config'

function ChatConversationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const chatId = searchParams.get('id')
  const [userInitials, setUserInitials] = useState('JE')
  const [conversationTitle, setConversationTitle] = useState('Chat')
  const { setActiveChat } = useNavigation()

  // Redirect to /chat if no ID provided
  useEffect(() => {
    if (!chatId) {
      router.push('/chat')
    }
  }, [chatId, router])

  const fetchConversationTitle = useCallback(async () => {
    if (!chatId) return

    try {
      const response = await fetch(getApiUrl(`/api/conversations/${chatId}`))
      if (response.ok) {
        const { conversation } = await response.json()
        setConversationTitle(conversation.title)
      }
    } catch (error) {
      console.error('Error fetching conversation:', error)
    }
  }, [chatId])

  useEffect(() => {
    if (!chatId) return

    // Get user initials
    const storedName = localStorage.getItem('userName') || 'Jake Esse'
    const initials = storedName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    setUserInitials(initials)

    // Set active chat in navigation context
    setActiveChat(chatId)

    // Fetch conversation title
    fetchConversationTitle()
  }, [chatId, setActiveChat, fetchConversationTitle])

  const handleConversationUpdated = () => {
    // This will trigger the sidebar to refresh
    // The refresh happens automatically via the useEffect in Sidebar
  }

  const handleConversationCreated = (conversationId: string, title: string) => {
    setConversationTitle(title)
    setActiveChat(conversationId)
  }

  // Don't render if no chatId (will redirect)
  if (!chatId) {
    return (
      <PageLayout pageName="Chat">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#485C11] border-r-transparent mb-4"></div>
            <p className="text-slate-600 font-sans">Redirecting...</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout pageName={conversationTitle}>
      <ChatInterface
        chatId={chatId}
        userInitials={userInitials}
        onConversationCreated={handleConversationCreated}
        onConversationUpdated={handleConversationUpdated}
        // Don't pass onSendMessage to use real AI streaming
      />
    </PageLayout>
  )
}

export default function ChatConversationPage() {
  return (
    <Suspense fallback={
      <PageLayout pageName="Chat">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#485C11] border-r-transparent mb-4"></div>
            <p className="text-slate-600 font-sans">Loading conversation...</p>
          </div>
        </div>
      </PageLayout>
    }>
      <ChatConversationContent />
    </Suspense>
  )
}
