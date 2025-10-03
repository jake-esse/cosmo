'use client'

import { ChatInterface } from '@/components/chat/ChatInterface'
import { PageLayout } from '@/components/layout/PageLayout'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useNavigation } from '@/components/layout/NavigationContext'

export default function ChatDetailPage() {
  const params = useParams()
  const chatId = params.id as string
  const [userInitials, setUserInitials] = useState('JE')
  const [conversationTitle, setConversationTitle] = useState('Chat')
  const { setActiveChat } = useNavigation()

  const fetchConversationTitle = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations/${chatId}`)
      if (response.ok) {
        const { conversation } = await response.json()
        setConversationTitle(conversation.title)
      }
    } catch (error) {
      console.error('Error fetching conversation:', error)
    }
  }, [chatId])

  useEffect(() => {
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