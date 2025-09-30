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

export interface SearchSource {
  sourceType: 'url' | 'x' | 'news' | 'rss';
  title?: string;
  url?: string;
  snippet?: string;
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  model?: string
  webSearchUsed?: boolean
  sources?: SearchSource[]
}

interface ChatInterfaceProps {
  chatId?: string
  initialMessages?: Message[]
  userInitials?: string
  onSendMessage?: (message: string, reasoning: boolean, webSearch: boolean) => Promise<string>
  onConversationCreated?: (conversationId: string, title: string) => void
  onConversationUpdated?: () => void
}

export function ChatInterface({
  chatId,
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
  const [reasoning, setReasoning] = useState<boolean>(false)
  const [webSearch, setWebSearch] = useState<boolean>(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState<string>('')
  const [conversationModel, setConversationModel] = useState<string | null>(null)
  const [totalTokensUsed, setTotalTokensUsed] = useState<number>(0)
  const [showContextLimitDialog, setShowContextLimitDialog] = useState(false)
  const [waitingForAiResponse, setWaitingForAiResponse] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [userHasScrolled, setUserHasScrolled] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastScrollTop = useRef<number>(0)

  // Track if we've loaded this conversation
  const [loadedConversationId, setLoadedConversationId] = useState<string | null>(null)

  // Track if we need to send a pending message after redirect
  const pendingMessageRef = useRef<boolean>(false)

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

      // Check if we have a pending message to send (from model change redirect)
      if (lastUserMessage && messages.length === 0 && !pendingMessageRef.current) {
        pendingMessageRef.current = true // Prevent duplicate sends
        // Send the pending message after a short delay
        const pendingMessage = lastUserMessage
        const pendingReasoning = reasoning
        const pendingWebSearch = webSearch

        setTimeout(() => {
          setLastUserMessage('') // Clear it before sending to avoid loops
          handleSendMessage(pendingMessage, pendingReasoning, pendingWebSearch)
          pendingMessageRef.current = false
        }, 100)
      }
    }
  }, [chatId, loadedConversationId])

  // Auto-scroll logic for user messages
  const scrollToLatestUserMessage = useCallback(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      // Use the ref to get the scroll container
      const scrollContainer = scrollContainerRef.current
      if (!scrollContainer) {
        console.log('[SCROLL] No scroll container found from ref')
        return
      }

      // Find all user message elements
      const userMessages = document.querySelectorAll('[data-message-role="user"]')
      console.log('[SCROLL] Found', userMessages.length, 'user messages')

      if (userMessages.length === 0) {
        console.log('[SCROLL] No user messages found')
        return
      }

      const latestUserMessage = userMessages[userMessages.length - 1] as HTMLElement
      if (!latestUserMessage) {
        console.log('[SCROLL] Latest user message element not found')
        return
      }

      // Get the position of the user message relative to the scroll container
      const containerRect = scrollContainer.getBoundingClientRect()
      const messageRect = latestUserMessage.getBoundingClientRect()

      // Calculate the scroll position to put the message at the top with some padding
      const paddingTop = 20 // pixels from top for visual spacing
      const targetScrollTop = scrollContainer.scrollTop + messageRect.top - containerRect.top - paddingTop

      console.log('[SCROLL] Scrolling to position:', targetScrollTop, {
        currentScrollTop: scrollContainer.scrollTop,
        messageTop: messageRect.top,
        containerTop: containerRect.top,
        containerHeight: containerRect.height
      })

      // Smooth scroll to the calculated position
      scrollContainer.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      })
    })
  }, [])

  // Scroll when a new user message is added
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]

      // Scroll to latest user message when the last message is from the user
      if (lastMessage.role === 'user') {
        console.log('[SCROLL] New user message detected, scheduling scroll...')

        // Use multiple timeouts to handle different render timings
        const timeout1 = setTimeout(scrollToLatestUserMessage, 100)
        const timeout2 = setTimeout(scrollToLatestUserMessage, 300)
        const timeout3 = setTimeout(scrollToLatestUserMessage, 500)

        return () => {
          clearTimeout(timeout1)
          clearTimeout(timeout2)
          clearTimeout(timeout3)
        }
      }
    }
  }, [messages, scrollToLatestUserMessage])

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
      
      // Set reasoning mode based on conversation model
      if (conversation.model) {
        setReasoning(conversation.model === 'grok-4-fast-reasoning')
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

  // Detect user scrolling
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      // Check if this was a user-initiated scroll
      const currentScrollTop = scrollContainer.scrollTop
      const scrollDelta = Math.abs(currentScrollTop - lastScrollTop.current)

      // If scroll changed significantly and we're streaming, assume user scrolled
      if (isStreaming && scrollDelta > 10) {
        setUserHasScrolled(true)
      }

      lastScrollTop.current = currentScrollTop
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [isStreaming])

  // Keep user message at top during streaming (only if user hasn't scrolled)
  useEffect(() => {
    if (isStreaming && !userHasScrolled && scrollContainerRef.current) {
      // During streaming, keep the user message at the top only if user hasn't scrolled
      const scrollInterval = setInterval(() => {
        const userMessages = document.querySelectorAll('[data-message-role="user"]')
        if (userMessages.length > 0 && !userHasScrolled) {
          const latestUserMessage = userMessages[userMessages.length - 1] as HTMLElement
          if (latestUserMessage && scrollContainerRef.current) {
            const containerRect = scrollContainerRef.current.getBoundingClientRect()
            const messageRect = latestUserMessage.getBoundingClientRect()
            const currentOffset = messageRect.top - containerRect.top

            // Only adjust if the message has drifted from the top
            if (Math.abs(currentOffset - 20) > 5) {
              const targetScrollTop = scrollContainerRef.current.scrollTop + currentOffset - 20
              lastScrollTop.current = targetScrollTop // Update our reference
              scrollContainerRef.current.scrollTo({
                top: targetScrollTop,
                behavior: 'instant' // Use instant to avoid jitter
              })
            }
          }
        }
      }, 100) // Check every 100ms

      return () => clearInterval(scrollInterval)
    }
  }, [isStreaming, userHasScrolled])

  const handleSendMessage = async (content: string, reasoningMode: boolean, webSearchMode: boolean) => {
    // Determine model based on reasoning state
    const model = reasoningMode ? 'grok-4-fast-reasoning' : 'grok-4-fast-non-reasoning'
    console.log('Sending message with reasoning:', reasoningMode, 'Web search:', webSearchMode, 'Model:', model, 'Content:', content)

    // Note: We allow model changes within the same conversation
    // Users can toggle reasoning on/off without creating a new chat
    
    // Check context limit before sending
    // Use the current model for checking limits
    const exceedsLimit = await wouldExceedContextLimit(
      totalTokensUsed,
      content,
      model
    )
    
    if (exceedsLimit) {
      setShowContextLimitDialog(true)
      return
    }
    
    setLastUserMessage(content)
    setReasoning(reasoningMode)
    setWebSearch(webSearchMode)
    setChatError(null)
    
    // Create conversation on first message if needed
    let currentConversationId = conversationId
    if (!currentConversationId) {
      const newConvId = await createConversation(content, model)
      if (newConvId) {
        currentConversationId = newConvId
        // Set the conversation model only when creating the conversation
        setConversationModel(model)
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
    setWaitingForAiResponse(true) // Enable spacer for auto-scroll
    setUserHasScrolled(false) // Reset scroll flag for new message

    // Trigger immediate scroll to position the new user message at the top
    // The spacer will ensure there's enough space to scroll to top
    setTimeout(scrollToLatestUserMessage, 150)
    setTimeout(scrollToLatestUserMessage, 400)
    setTimeout(scrollToLatestUserMessage, 600)

    // Save user message to database with correct attachments
    if (currentConversationId) {
      await saveMessage(userMessage, currentConversationId)
    }

    try {
      if (onSendMessage) {
        console.log('Using custom onSendMessage handler')
        // Use custom handler if provided
        const response = await onSendMessage(content, reasoningMode, webSearchMode)
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
        setWaitingForAiResponse(false) // AI has responded, remove spacer
        setIsStreaming(false)
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
            })),
            webSearch: webSearchMode
          })
        })

        console.log('API Response status:', response.status)

        if (!response.ok) {
          const errorData = await response.json()
          console.error('API Error:', errorData)
          setChatError(errorData)
          setWaitingForAiResponse(false) // Remove spacer on API error
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
        setIsStreaming(true)
        // Keep the spacer during streaming to maintain scroll position

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              console.log('Stream finished, total content length:', aiContent.length)

              // Extract sources from the stream if present
              let sources: SearchSource[] | undefined = undefined
              let displayContent = aiContent

              const sourcesMatch = aiContent.match(/__SOURCES_START__(.+?)__SOURCES_END__/)
              if (sourcesMatch) {
                try {
                  sources = JSON.parse(sourcesMatch[1])
                  // Remove the sources marker from display content
                  displayContent = aiContent.replace(/__SOURCES_START__.+?__SOURCES_END__/, '').trim()
                  console.log('[CHAT] Extracted', sources?.length, 'sources from stream')
                } catch (error) {
                  console.error('[CHAT] Error parsing sources:', error)
                }
              }

              // Check if web search was used
              const webSearchUsed = webSearchMode && (sources && sources.length > 0 || /\[\d+\]|\(\d+\)|https?:\/\/[^\s]+/i.test(displayContent))

              // Update the final message with complete content and sources
              setMessages(prev => prev.map(msg =>
                msg.id === aiMessage.id
                  ? { ...msg, content: displayContent, webSearchUsed, sources }
                  : msg
              ))

              // Clear streaming state
              setStreamingMessageId(null)
              setStreamingContent('')
              setIsStreaming(false)
              setWaitingForAiResponse(false) // Remove spacer after streaming completes
              setUserHasScrolled(false) // Reset scroll flag after streaming

              // Save AI message to database after streaming completes
              if (currentConversationId && displayContent) {
                await saveMessage({
                  id: aiMessage.id,
                  role: 'assistant',
                  content: displayContent,
                  model
                }, currentConversationId)
              }
              break
            }

            // The stream returns plain text chunks
            const chunk = decoder.decode(value, { stream: true })
            aiContent += chunk

            // Debug: Log first chunk to check markdown presence
            if (aiContent.length <= 100) {
              console.log('[CHAT] Streaming chunk sample:', chunk)
            }

            // Don't show the sources marker while streaming
            let displayContentWhileStreaming = aiContent
            const partialSourcesMatch = aiContent.match(/__SOURCES_START__/)
            if (partialSourcesMatch) {
              // If we see the start of sources marker, hide it from display
              displayContentWhileStreaming = aiContent.split('__SOURCES_START__')[0]
            }

            // Update streaming content without modifying messages array
            setStreamingContent(displayContentWhileStreaming)
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
      setWaitingForAiResponse(false) // Remove spacer on error
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setChatError(null)
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage, reasoning, webSearch)
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
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage, reasoning, webSearch)
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
    handleSendMessage(newContent, reasoning, webSearch)
  }

  const handleStartNewChat = async (reasoningMode?: boolean, webSearchMode?: boolean, pendingMessage?: string) => {
    const newReasoning = reasoningMode !== undefined ? reasoningMode : reasoning
    const newWebSearch = webSearchMode !== undefined ? webSearchMode : webSearch

    // Clear current conversation state
    setMessages([])
    setConversationId(null)
    setConversationModel(null)
    setTotalTokensUsed(0)
    setShowContextLimitDialog(false)
    setChatError(null)
    setReasoning(newReasoning)
    setWebSearch(newWebSearch)
    // Don't reset loadedConversationId when creating a new chat to avoid triggering reload

    // Navigate to /chat for new conversation
    router.push('/chat')

    // If we have a pending message, send it after navigation
    if (pendingMessage) {
      // Store the pending message in state to be sent after navigation completes
      setLastUserMessage(pendingMessage)
      // The message will be sent when the /chat page loads with no chatId
    }
  }

  const handleReasoningChange = (reasoningMode: boolean) => {
    setReasoning(reasoningMode)

    // Determine new model based on reasoning mode
    const newModel = reasoningMode ? 'grok-4-fast-reasoning' : 'grok-4-fast-non-reasoning'

    // If conversation exists and model is different, this will trigger new chat
    if (conversationModel && newModel !== conversationModel && messages.length > 0) {
      // The actual new chat creation will happen when user sends a message
      // For now, just update the reasoning state
    }
  }

  const handleWebSearchChange = (webSearchMode: boolean) => {
    setWebSearch(webSearchMode)
  }


  // Check if we have actual messages with content
  const hasMessages = messages.some(m => m.content && m.content.trim().length > 0)

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area with conditional background */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto flex flex-col relative"
      >
        {/* Background layer with transition - Show on both mobile and desktop */}
        <div 
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{
            backgroundImage: 'url(/images/hero-landscape.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: !hasMessages ? 1 : 0,
            pointerEvents: 'none'
          }}
        />
        
        {/* Remove white overlay to allow glassmorphism effect */}
        
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
        {!isLoadingConversation && !hasMessages && (
          <div className="flex-1 flex flex-col">
            {/* Logo + Ampel at top for mobile, hidden on desktop */}
            <div className="md:hidden pt-16 pb-8 text-center">
              <div className="flex items-end justify-center gap-2">
                <VineIcon className="w-10 h-10 text-white" />
                <span className="font-sans font-medium text-[32px] text-white tracking-[-1.5px] leading-[0.75]">
                  Ampel
                </span>
              </div>
            </div>
            
            {/* Centered content */}
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center w-full max-w-3xl px-2 md:px-6">
                {/* Desktop: icon + text, Mobile: text only */}
                <div className="hidden md:flex items-end gap-0.5 mb-6">
                  <VineIcon className="w-16 h-16 text-white flex-shrink-0 mb-[-3px]" />
                  <h2 className="text-5xl font-brand text-white text-left leading-[0.9]">
                    How can I help you today?
                  </h2>
                </div>
                {/* Mobile: text only */}
                <h2 className="md:hidden text-[28px] font-brand text-white text-center mb-6 leading-[0.9]">
                  How can I help you today?
                </h2>
                {/* Input with same width as chat messages */}
                <div className="w-full flex justify-center">
                  <ChatInput
                    onSend={handleSendMessage}
                    isLoading={isLoading}
                    reasoning={reasoning}
                    onReasoningChange={handleReasoningChange}
                    webSearch={webSearch}
                    onWebSearchChange={handleWebSearchChange}
                    hasMessages={false}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {!isLoadingConversation && hasMessages && (
          <div className="py-4 md:py-6 pb-[180px] md:pb-[200px] bg-white">
            <div className="flex flex-col items-center px-4 md:px-6">
              <div className="w-full max-w-3xl">
                {/* Error display */}
                {chatError && (
                  <div className="mb-4">
                    <ChatError
                      message={chatError.message}
                      code={chatError.code}
                      canRetry={chatError.canRetry}
                      suggestedAction={chatError.suggestedAction}
                      onRetry={handleRetry}
                      onChangeModel={handleChangeModel}
                    />
                  </div>
                )}

                {messages.map((message, index) => {
                  const prevMessage = index > 0 ? messages[index - 1] : null
                  const isUserAfterAI = message.role === 'user' && prevMessage?.role === 'assistant'
                  const isAIAfterUser = message.role === 'assistant' && prevMessage?.role === 'user'

                  return (
                    <div
                      key={message.id}
                      className={`w-full ${
                        isUserAfterAI ? 'mt-8' :
                        isAIAfterUser ? 'mt-2' :
                        index > 0 ? 'mt-4' : ''
                      }`}
                      data-message-role={message.role}
                    >
                      {message.role === 'user' ? (
                        <MessageUser
                          message={message.content}
                          timestamp={message.timestamp}
                          userInitials={userInitials}
                          canEdit={true}
                          onEdit={(newContent) => handleEditMessage(index, newContent)}
                        />
                      ) : message.role === 'assistant' ? (
                        <div className="pl-3 pt-2">
                          <MessageAI
                            message={message.id === streamingMessageId ? streamingContent : message.content}
                            timestamp={message.timestamp}
                            model={message.model}
                            isLastMessage={index === messages.length - 1}
                            onRegenerate={handleRegenerate}
                            webSearchUsed={message.webSearchUsed}
                            sources={message.sources}
                          />
                        </div>
                      ) : null}
                    </div>
                  )
                })}
                
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="w-full">
                    <div className="pl-3 pt-2">
                      <MessageAI
                        message=""
                        isLoading={true}
                      />
                    </div>
                  </div>
                )}

                {/* Spacer to push user message to top when waiting for AI response */}
                {waitingForAiResponse && (
                  <div
                    className="w-full"
                    style={{
                      minHeight: '70vh', // Ensure enough space to scroll message to top
                      transition: 'min-height 0.3s ease-out'
                    }}
                  />
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Chat Input - fixed at bottom when messages exist */}
      {!isLoadingConversation && hasMessages && (
        <div className="fixed bottom-0 left-0 right-0 md:left-[240px] p-4 md:p-6 z-20">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              onSend={handleSendMessage}
              isLoading={isLoading}
              reasoning={reasoning}
              onReasoningChange={handleReasoningChange}
              webSearch={webSearch}
              onWebSearchChange={handleWebSearchChange}
              hasMessages={true}
            />
          </div>
        </div>
      )}
      
      {/* Context Limit Dialog */}
      <ContextLimitDialog
        open={showContextLimitDialog}
        modelId={conversationModel || (reasoning ? 'grok-4-fast-reasoning' : 'grok-4-fast-non-reasoning')}
        onStartNewChat={() => handleStartNewChat()}
      />
    </div>
  )
}