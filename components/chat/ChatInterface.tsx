'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MessageUser } from './MessageUser'
import { MessageAI } from './MessageAI'
import { ChatInput } from './ChatInput'
import { ChatError } from './ChatError'
import { ContextLimitDialog } from './ContextLimitDialog'
import { VineIcon } from '@/components/icons'
import { useRouter } from 'next/navigation'
import { wouldExceedContextLimit } from '@/lib/ai/tokenizer'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  model?: string
}

interface ChatInterfaceProps {
  chatId?: string
  chatName?: string
  initialMessages?: Message[]
  userInitials?: string
  onSendMessage?: (message: string, model: string) => Promise<string>
  onConversationCreated?: (conversationId: string, title: string) => void
  onConversationUpdated?: () => void
}

export function ChatInterface({ 
  chatId,
  chatName = 'Chat',
  initialMessages = [],
  userInitials = 'JE',
  onSendMessage,
  onConversationCreated,
  onConversationUpdated
}: ChatInterfaceProps) {
  const router = useRouter()
  const [conversationId, setConversationId] = useState<string | null>(chatId || null)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingConversation, setIsLoadingConversation] = useState(!!chatId) // Start loading if we have a chatId
  const [chatError, setChatError] = useState<any>(null)
  const [lastUserMessage, setLastUserMessage] = useState<string>('')
  const [lastSelectedModel, setLastSelectedModel] = useState<string>('gemini-2.5-flash-lite')
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState<string>('')
  const [conversationModel, setConversationModel] = useState<string | null>(null)
  const [totalTokensUsed, setTotalTokensUsed] = useState<number>(0)
  const [showContextLimitDialog, setShowContextLimitDialog] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Track if we've loaded this conversation
  const [loadedConversationId, setLoadedConversationId] = useState<string | null>(null)

  // Load conversation if chatId is provided
  useEffect(() => {
    console.log('[useEffect] chatId:', chatId, 'loadedConversationId:', loadedConversationId, 'messages:', messages.length)

    if (chatId) {
      // Load the conversation if we haven't loaded this specific conversation yet
      if (chatId !== loadedConversationId) {
        console.log('[useEffect] Loading conversation for chatId:', chatId)
        setConversationId(chatId)
        setMessages([]) // Clear messages first
        loadConversation(chatId)
        setLoadedConversationId(chatId) // Mark this conversation as loaded
      }
    } else {
      // No chatId means new conversation
      setConversationId(null)
      setMessages([])
      setConversationModel(null)
      setTotalTokensUsed(0)
      setLoadedConversationId(null)
    }
  }, [chatId, loadedConversationId])

  const loadConversation = async (id: string) => {
    try {
      setIsLoadingConversation(true)
      const response = await fetch(`/api/conversations/${id}`)
      if (!response.ok) {
        console.error('Failed to load conversation')
        return
      }

      const { conversation, messages: dbMessages } = await response.json()

      console.log('[LoadConversation] Loaded messages:', dbMessages?.length, 'messages')

      // Convert database messages to chat interface format
      const formattedMessages: Message[] = dbMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        model: msg.model,
      }))

      console.log('[LoadConversation] Setting messages:', formattedMessages.length)
      setMessages(formattedMessages)
      setConversationId(id)
      setConversationModel(conversation.model)
      setTotalTokensUsed(conversation.total_tokens_used || 0)
      
      // Set the selected model to match the conversation
      if (conversation.model) {
        setLastSelectedModel(conversation.model)
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
    } finally {
      setIsLoadingConversation(false)
    }
  }

  const createConversation = async (firstMessage: string, model: string) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          firstMessage,
          model 
        }),
      })

      if (!response.ok) {
        console.error('Failed to create conversation')
        return null
      }

      const conversation = await response.json()
      setConversationId(conversation.id)
      setConversationModel(model)
      setTotalTokensUsed(0)
      setLoadedConversationId(conversation.id) // Mark as loaded so we don't reload it

      // Notify parent component
      if (onConversationCreated) {
        onConversationCreated(conversation.id, conversation.title)
      }

      // Don't navigate here - let the parent component handle URL updates
      // This prevents double navigation and component remounting
      
      return conversation.id
    } catch (error) {
      console.error('Error creating conversation:', error)
      return null
    }
  }

  const saveMessage = async (message: Message, convId: string) => {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: convId,
          role: message.role,
          content: message.content,
          model: message.model || conversationModel,
        }),
      })
      
      if (response.ok) {
        // Get updated token count from response
        const data = await response.json()
        if (data.tokens_used) {
          setTotalTokensUsed(prev => prev + data.tokens_used)
        }
      }
      
      // Notify parent to refresh sidebar
      if (onConversationUpdated) {
        onConversationUpdated()
      }
    } catch (error) {
      console.error('Error saving message:', error)
    }
  }

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (content: string, model: string) => {
    console.log('Sending message with model:', model, 'Content:', content)

    // Check if model changed from conversation model
    if (conversationModel && model !== conversationModel && messages.length > 0) {
      // Create new conversation with different model
      await handleStartNewChat(model)
      return
    }
    
    // Check context limit before sending
    const modelToUse = conversationModel || model
    const exceedsLimit = await wouldExceedContextLimit(
      totalTokensUsed,
      content,
      modelToUse
    )
    
    if (exceedsLimit) {
      setShowContextLimitDialog(true)
      return
    }
    
    setLastUserMessage(content)
    setLastSelectedModel(model)
    setChatError(null)
    
    // Create conversation on first message if needed
    let currentConversationId = conversationId
    if (!currentConversationId) {
      const newConvId = await createConversation(content, model)
      if (newConvId) {
        currentConversationId = newConvId
      }
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // Save user message to database with correct attachments
    if (currentConversationId) {
      await saveMessage(userMessage, currentConversationId)
    }

    try {
      if (onSendMessage) {
        console.log('Using custom onSendMessage handler')
        // Use custom handler if provided
        const response = await onSendMessage(content, model)
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date().toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          model
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        console.log('Using real AI streaming API')
        // Use real AI streaming
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            modelId: model,
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content
            }))
          })
        })

        console.log('API Response status:', response.status)

        if (!response.ok) {
          const errorData = await response.json()
          console.error('API Error:', errorData)
          setChatError(errorData)
          return
        }

        // Handle streaming response
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let aiContent = ''
        
        console.log('Starting to read stream...')
        
        // Add placeholder AI message
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
          model
        }
        
        // Set streaming state
        setStreamingMessageId(aiMessage.id)
        setStreamingContent('')
        setMessages(prev => [...prev, aiMessage])
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              console.log('Stream finished, total content:', aiContent)
              
              // Update the final message with complete content
              setMessages(prev => prev.map(msg => 
                msg.id === aiMessage.id 
                  ? { ...msg, content: aiContent }
                  : msg
              ))
              
              // Clear streaming state
              setStreamingMessageId(null)
              setStreamingContent('')
              
              // Save AI message to database after streaming completes
              if (currentConversationId && aiContent) {
                await saveMessage({
                  id: aiMessage.id,
                  role: 'assistant',
                  content: aiContent,
                  model
                }, currentConversationId)
              }
              break
            }
            
            // The toTextStreamResponse() returns plain text chunks
            const chunk = decoder.decode(value, { stream: true })
            aiContent += chunk
            
            // Debug: Log first chunk to check markdown presence
            if (aiContent.length <= 100) {
              console.log('[CHAT] Streaming chunk sample:', chunk)
            }
            
            // Update streaming content without modifying messages array
            setStreamingContent(aiContent)
          }
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      setChatError({
        error: true,
        message: error.message || 'Failed to send message. Please try again.',
        canRetry: true
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setChatError(null)
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage, lastSelectedModel)
    }
  }

  const handleChangeModel = () => {
    setChatError(null)
  }

  const handleRegenerate = () => {
    // Remove the last AI message
    const filteredMessages = messages.filter((msg, idx) => 
      !(idx === messages.length - 1 && msg.role === 'assistant')
    )
    setMessages(filteredMessages)
    
    // Resend the last user message
    if (lastUserMessage && lastSelectedModel) {
      handleSendMessage(lastUserMessage, lastSelectedModel)
    }
  }

  const handleEditMessage = (messageIndex: number, newContent: string) => {
    // Get all messages up to and including the edited one
    const messagesBeforeEdit = messages.slice(0, messageIndex + 1)
    
    // Update the edited message
    messagesBeforeEdit[messageIndex] = {
      ...messagesBeforeEdit[messageIndex],
      content: newContent
    }
    
    // Set the new message list
    setMessages(messagesBeforeEdit)
    
    // Resend from the edited message
    setLastUserMessage(newContent)
    handleSendMessage(newContent, lastSelectedModel || 'gemini-2.5-flash-lite')
  }

  const handleStartNewChat = async (modelId?: string) => {
    const newModel = modelId || conversationModel || lastSelectedModel
    
    // Clear current conversation state
    setMessages([])
    setConversationId(null)
    setConversationModel(null)
    setTotalTokensUsed(0)
    setShowContextLimitDialog(false)
    setChatError(null)
    setLastSelectedModel(newModel)
    setLoadedConversationId(null) // Reset loaded conversation tracker
    
    // If we have a pending message, send it after creating new conversation
    if (lastUserMessage && modelId) {
      setTimeout(() => {
        handleSendMessage(lastUserMessage, newModel)
      }, 100)
    }
    
    // Notify parent to update URL to new chat
    if (onConversationCreated) {
      // Use a placeholder ID to trigger navigation to /chat
      router.push('/chat')
    }
  }

  const handleModelChange = (newModel: string) => {
    setLastSelectedModel(newModel)
    
    // If conversation exists and model is different, this will trigger new chat
    if (conversationModel && newModel !== conversationModel && messages.length > 0) {
      // The actual new chat creation will happen when user sends a message
      // For now, just update the selected model
    }
  }


  return (
    <div className="flex flex-col h-full">
      {/* Messages Area with conditional background */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto flex flex-col relative"
      >
        {/* Background layer with transition */}
        <div 
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{
            backgroundImage: 'url(/images/hero-landscape.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: messages.length === 0 ? 1 : 0,
            pointerEvents: 'none'
          }}
        />
        
        {/* White overlay that fades in when messages appear */}
        <div 
          className="absolute inset-0 bg-white transition-opacity duration-700 ease-in-out"
          style={{
            opacity: messages.length > 0 ? 1 : 0,
            pointerEvents: 'none'
          }}
        />
        
        {/* Content layer */}
        <div className="relative z-10 flex-1 flex flex-col">
        {/* Show loading state when loading a conversation */}
        {isLoadingConversation && (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-transparent"></div>
              <p className="text-slate-700 text-body-md">Loading conversation...</p>
            </div>
          </div>
        )}

        {/* Empty state with input centered below greeting */}
        {!isLoadingConversation && messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center w-full max-w-3xl px-6">
              <div className="flex items-end gap-0.5 mb-6">
                <VineIcon className="w-16 h-16 text-white" />
                <h2 className="text-5xl font-brand text-white">
                  How can I help you today?
                </h2>
              </div>
              {/* Input with same width as chat messages */}
              <div className="w-full">
                <ChatInput 
                  onSend={handleSendMessage}
                  isLoading={isLoading}
                  selectedModelId={lastSelectedModel}
                  onModelChange={handleModelChange}
                  conversationModel={conversationModel}
                  hasMessages={messages.length > 0}
                />
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {!isLoadingConversation && messages.length > 0 && (
          <div className="py-6">
            <div className="flex flex-col items-center px-6">
              <div className="w-full max-w-3xl space-y-4">
                {/* Error display */}
                {chatError && (
                  <ChatError
                    message={chatError.message}
                    code={chatError.code}
                    canRetry={chatError.canRetry}
                    suggestedAction={chatError.suggestedAction}
                    onRetry={handleRetry}
                    onChangeModel={handleChangeModel}
                  />
                )}
                
                {messages.map((message, index) => (
                  <div key={message.id} className="w-full">
                    {message.role === 'user' ? (
                      <MessageUser 
                        message={message.content}
                        timestamp={message.timestamp}
                        userInitials={userInitials}
                        canEdit={true}
                        onEdit={(newContent) => handleEditMessage(index, newContent)}
                      />
                    ) : message.role === 'assistant' ? (
                      <MessageAI 
                        message={message.id === streamingMessageId ? streamingContent : message.content}
                        timestamp={message.timestamp}
                        model={message.model}
                        isLastMessage={index === messages.length - 1}
                        onRegenerate={handleRegenerate}
                      />
                    ) : null}
                  </div>
                ))}
                
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="w-full">
                    <MessageAI 
                      message=""
                      isLoading={true}
                    />
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Chat Input - only at bottom when messages exist */}
      {!isLoadingConversation && messages.length > 0 && (
        <div className="p-6 bg-white">
          <div className="max-w-3xl mx-auto">
            <ChatInput 
              onSend={handleSendMessage}
              isLoading={isLoading}
              selectedModelId={lastSelectedModel}
              onModelChange={handleModelChange}
              conversationModel={conversationModel}
              hasMessages={messages.length > 0}
              conversationId={conversationId || undefined}
            />
          </div>
        </div>
      )}
      
      {/* Context Limit Dialog */}
      <ContextLimitDialog
        open={showContextLimitDialog}
        modelId={conversationModel || lastSelectedModel}
        onStartNewChat={() => handleStartNewChat()}
      />
    </div>
  )
}