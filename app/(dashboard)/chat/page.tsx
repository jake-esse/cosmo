'use client'

import { ChatInterface } from '@/components/chat/ChatInterface'
import { PageLayout } from '@/components/layout/PageLayout'
import { useEffect, useState } from 'react'
import { useNavigation } from '@/components/layout/NavigationContext'
import { useSearchParams } from 'next/navigation'

export default function ChatPage() {
  const [userInitials, setUserInitials] = useState('JE')
  const [conversationTitle, setConversationTitle] = useState('Chat')
  const [currentChatId, setCurrentChatId] = useState<string | undefined>()
  const { setActiveChat } = useNavigation()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Get user initials from localStorage or session
    // This would normally come from your auth context
    const storedName = localStorage.getItem('userName') || 'Jake Esse'
    const initials = storedName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    setUserInitials(initials)
  }, [])

  const handleConversationCreated = (conversationId: string, title: string) => {
    console.log('Conversation created:', conversationId, title)
    setConversationTitle(title)
    setActiveChat(conversationId)
    setCurrentChatId(conversationId)
    
    // Update URL without navigation to prevent component remount
    window.history.replaceState({}, '', `/chat/${conversationId}`)
  }

  const handleConversationUpdated = () => {
    // This will trigger the sidebar to refresh
    // The refresh happens automatically via the useEffect in Sidebar
  }

  return (
    <PageLayout pageName={conversationTitle}>
      <ChatInterface
        chatId={currentChatId}
        userInitials={userInitials}
        onConversationCreated={handleConversationCreated}
        onConversationUpdated={handleConversationUpdated}
        // Don't pass onSendMessage to use real AI streaming
      />
    </PageLayout>
  )
}