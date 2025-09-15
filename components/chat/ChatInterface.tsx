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
import { UploadedFile, FileAttachment } from '@/lib/ai/types'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  model?: string
  attachments?: FileAttachment[]
}

interface ChatInterfaceProps {
  chatId?: string
  chatName?: string
  initialMessages?: Message[]
  userInitials?: string
  onSendMessage?: (message: string, model: string, attachments?: UploadedFile[]) => Promise<string>
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

  // Load conversation if chatId is provided
  useEffect(() => {
    if (chatId) {
      // Always reset and load when chatId changes
      setConversationId(chatId)
      setMessages([]) // Clear messages first
      loadConversation(chatId)
    } else {
      // No chatId means new conversation
      setConversationId(null)
      setMessages([])
      setConversationModel(null)
      setTotalTokensUsed(0)
    }
  }, [chatId])

  const loadConversation = async (id: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/conversations/${id}`)
      if (!response.ok) {
        console.error('Failed to load conversation')
        return
      }

      const { conversation, messages: dbMessages } = await response.json()
      
      // Convert database messages to chat interface format
      const formattedMessages: Message[] = dbMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        model: msg.model,
        attachments: msg.attachments || [],
      }))
      
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
      setIsLoading(false)
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
      
      // Notify parent component
      if (onConversationCreated) {
        onConversationCreated(conversation.id, conversation.title)
      }
      
      // Navigate to the new conversation URL if not already there
      if (!chatId && conversation.id) {
        router.push(`/chat/${conversation.id}`)
      }
      
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
          attachments: message.attachments || [],
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

  const handleSendMessage = async (content: string, model: string, filesOrUploaded?: UploadedFile[] | File[]) => {
    console.log('Sending message with model:', model, 'Content:', content, 'Files:', filesOrUploaded?.length || 0)
    
    let attachments: FileAttachment[] = []
    
    // Handle files that need uploading (File objects) vs already uploaded (UploadedFile objects)
    if (filesOrUploaded && filesOrUploaded.length > 0) {
      const firstItem = filesOrUploaded[0]
      
      if (firstItem instanceof File) {
        // Files need to be uploaded after conversation creation
        // We'll handle this after creating the conversation
      } else {
        // Already uploaded files
        attachments = (filesOrUploaded as UploadedFile[]).map(file => {
          const attachment: any = {
            id: file.id,
            fileName: file.fileName,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
            signedUrl: file.signedUrl,
            base64: file.processedFile?.base64,
            text: file.processedFile?.text,
            processedContent: file.processedFile?.processedContent,
            processingTimeMs: file.processedFile?.processingTimeMs
          };
          // Only include error if it exists
          if (file.processedFile?.error) {
            attachment.error = file.processedFile.error;
          }
          return attachment;
        })
      }
    }
    
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
    
    // Upload files if they're File objects (for both new and existing conversations)
    if (filesOrUploaded && filesOrUploaded.length > 0 && filesOrUploaded[0] instanceof File && currentConversationId) {
      const uploadedFiles = await uploadFilesForConversation(filesOrUploaded as File[], currentConversationId, model)
      attachments = uploadedFiles.map(file => {
        const attachment: any = {
          id: file.id,
          fileName: file.fileName,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          signedUrl: file.signedUrl,
          base64: file.processedFile?.base64,
          text: file.processedFile?.text,
          processedContent: file.processedFile?.processedContent,
          processingTimeMs: file.processedFile?.processingTimeMs
        };
        // Only include error if it exists
        if (file.processedFile?.error) {
          attachment.error = file.processedFile.error;
        }
        return attachment;
      })
    }

    // Add user message AFTER attachments are properly uploaded
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      attachments: attachments.length > 0 ? attachments : undefined,
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
        const response = await onSendMessage(content, model, filesOrUploaded as UploadedFile[])
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
              content: m.content,
              attachments: m.attachments
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

  // Helper function to upload files for a conversation
  const uploadFilesForConversation = async (files: File[], convId: string, modelId: string): Promise<UploadedFile[]> => {
    const formData = new FormData()
    
    files.forEach(file => {
      formData.append('files', file)
    })
    
    formData.append('conversationId', convId)
    
    // Get provider from model
    const model = await fetch('/api/chat/models')
      .then(res => res.json())
      .then(data => data.models?.find((m: any) => m.model_id === modelId))
    
    formData.append('provider', model?.provider || 'anthropic')

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      return result.uploaded || []
    } catch (error) {
      console.error('Upload error:', error)
      return []
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
        {/* Empty state with input centered below greeting */}
        {messages.length === 0 && (
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
                  conversationId={conversationId || undefined}
                />
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
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
                        attachments={message.attachments}
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
      {messages.length > 0 && (
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