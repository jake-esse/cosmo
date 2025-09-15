'use client'

import React, { useState, useRef, KeyboardEvent, useEffect, useCallback } from 'react'
import { SendIcon, ChevronDownIcon } from '@/components/icons'
import { ModelConfig, UploadedFile } from '@/lib/ai/types'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Crown, Zap } from 'lucide-react'
import { FileUploadButton } from './FileUploadButton'
import { FilePreview } from './FilePreview'

interface ChatInputProps {
  onSend: (message: string, model: string, attachments?: UploadedFile[]) => void
  isLoading?: boolean
  selectedModelId?: string
  onModelChange?: (model: string) => void
  conversationModel?: string | null
  hasMessages?: boolean
  conversationId?: string
}

export function ChatInput({ onSend, isLoading = false, selectedModelId, onModelChange, conversationModel, hasMessages, conversationId }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [models, setModels] = useState<ModelConfig[]>([])
  const [selectedModel, setSelectedModel] = useState<string>(selectedModelId || 'gemini-2.5-flash-lite')
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [loadingModels, setLoadingModels] = useState(true)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Update selected model when selectedModelId prop changes
  useEffect(() => {
    if (selectedModelId) {
      setSelectedModel(selectedModelId)
    }
  }, [selectedModelId])

  useEffect(() => {
    fetchModels()
  }, [])

  // Fix initial textarea height to prevent placeholder cutoff
  useEffect(() => {
    if (textareaRef.current && !message) {
      textareaRef.current.style.height = '20px'
    }
  }, [])

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/chat/models')
      const data = await response.json()
      
      if (data.models) {
        setModels(data.models)
        
        // Set default model if current selection is not available
        if (!data.models.find((m: ModelConfig) => m.model_id === selectedModel)) {
          const defaultModel = data.models.find((m: ModelConfig) => m.model_id === 'gemini-2.5-flash-lite') || data.models[0]
          if (defaultModel) {
            setSelectedModel(defaultModel.model_id)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error)
    } finally {
      setLoadingModels(false)
    }
  }

  const handleSend = async () => {
    if ((message.trim() || uploadedFiles.length > 0 || selectedFiles.length > 0) && !isLoading && selectedModel) {
      // For new conversations without ID, we'll pass files to parent for handling
      let finalUploadedFiles = [...uploadedFiles]
      
      if (selectedFiles.length > 0 && conversationId) {
        // Only upload if we have a conversation ID
        const newUploads = await uploadFiles(selectedFiles)
        finalUploadedFiles = [...finalUploadedFiles, ...newUploads]
      }
      
      // Pass selected files to parent if no conversation ID yet
      const filesToSend = conversationId ? finalUploadedFiles : selectedFiles
      
      onSend(message.trim() || 'Please analyze the attached files.', selectedModel, filesToSend as any)
      
      // Clear state
      setMessage('')
      setSelectedFiles([])
      setUploadedFiles([])
      setUploadProgress({})
      if (textareaRef.current) {
        textareaRef.current.style.height = '20px'
      }
    }
  }

  const uploadFiles = async (files: File[]): Promise<UploadedFile[]> => {
    if (!conversationId) {
      console.error('No conversation ID available for file upload')
      return []
    }

    setUploading(true)
    const formData = new FormData()
    
    files.forEach(file => {
      formData.append('files', file)
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))
    })
    
    formData.append('conversationId', conversationId)
    formData.append('provider', currentModel?.provider || 'anthropic')

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          files.forEach(file => {
            if (newProgress[file.name] < 90) {
              newProgress[file.name] = Math.min(90, (newProgress[file.name] || 0) + 10)
            }
          })
          return newProgress
        })
      }, 200)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      
      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      
      // Set progress to 100% for successful uploads
      files.forEach(file => {
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
      })

      // Show any errors
      if (result.failed && result.failed.length > 0) {
        const errors = result.failed.map((f: any) => `${f.fileName}: ${f.error}`).join('\n')
        alert('Some files failed to upload:\n' + errors)
      }

      return result.uploaded || []
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload files. Please try again.')
      return []
    } finally {
      setUploading(false)
    }
  }

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(prev => [...prev, ...files].slice(0, 5)) // Max 5 files
  }, [])

  const handleRemoveFile = useCallback((index: number) => {
    const allFiles = [...selectedFiles, ...uploadedFiles]
    const fileToRemove = allFiles[index]
    
    if (index < selectedFiles.length) {
      // Remove from selected files
      setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    } else {
      // Remove from uploaded files
      const uploadedIndex = index - selectedFiles.length
      setUploadedFiles(prev => prev.filter((_, i) => i !== uploadedIndex))
    }
  }, [selectedFiles, uploadedFiles])

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFilesSelected(files)
    }
  }, [handleFilesSelected])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = '20px'
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = `${Math.min(scrollHeight, 90)}px`
    }
  }

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'free':
        return (
          <Badge variant="secondary" className="ml-1 px-1 py-0 text-[10px] h-4">
            FREE
          </Badge>
        )
      case 'plus':
        return (
          <Badge variant="default" className="ml-1 px-1 py-0 text-[10px] h-4 bg-blue-600">
            PLUS
          </Badge>
        )
      case 'pro':
        return (
          <Badge variant="default" className="ml-1 px-1 py-0 text-[10px] h-4 bg-purple-600">
            PRO
          </Badge>
        )
      default:
        return null
    }
  }


  const currentModel = models.find(m => m.model_id === selectedModel)

  const allFiles = [...selectedFiles, ...uploadedFiles]
  const hasAttachments = allFiles.length > 0

  return (
    <div className="w-full max-w-[803px]">
      {/* Main input container */}
      <div 
        ref={dropZoneRef}
        className={`relative w-full rounded-[30px] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)] transition-all ${
          isDragging ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        }`}
        style={{
          height: '134px',
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          transform: 'translateZ(0)'
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 rounded-[30px] bg-blue-50/90 flex items-center justify-center">
            <p className="text-blue-600 font-medium">Drop files here to upload</p>
          </div>
        )}

        {/* Textarea */}
        <textarea
        ref={textareaRef}
        value={message}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        className="absolute left-[18px] top-[18px] right-[18px] text-body-md text-slate-900 placeholder-slate-700 bg-transparent resize-none focus:outline-none"
        style={{ minHeight: '20px', maxHeight: '90px', height: message ? 'auto' : '20px' }}
        disabled={isLoading}
      />
      
      {/* Bottom Row Container - File upload, Model selector and Send button */}
      <div className="absolute bottom-[18px] left-[18px] right-[18px] flex items-center justify-between">
        {/* File Upload Button on left */}
        <FileUploadButton 
          onFilesSelected={handleFilesSelected}
          disabled={isLoading || uploading || allFiles.length >= 5}
          maxFiles={5 - allFiles.length}
        />
        
        {/* Model selector and Send button on right */}
        <div className="flex items-center gap-3">
        {/* Model Selector */}
        <div className="relative z-10">
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/30 hover:bg-white/50 transition-colors"
            disabled={isLoading || loadingModels}
          >
            {currentModel ? (
              <>
                <span className="text-label-lg text-slate-700">
                  {currentModel.display_name}
                </span>
                {getTierBadge(currentModel.tier_required)}
              </>
            ) : (
              <span className="text-label-lg text-slate-500">
                {loadingModels ? 'Loading...' : 'Select Model'}
              </span>
            )}
            <ChevronDownIcon className="w-4 h-4 text-slate-600 ml-1" strokeWidth={1} />
          </button>
          
          {showModelSelector && models.length > 0 && (
            <div 
              className="absolute bottom-full right-0 mb-2 w-64 rounded-[20px] shadow-xl z-50 overflow-hidden"
              style={{
                transform: 'translateZ(0)',
                willChange: 'transform'
              }}
            >
              <div 
                className="absolute inset-0 rounded-[20px]" 
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.75)',
                  backdropFilter: 'blur(40px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                  boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
                  transform: 'translateZ(0)'
                }}
              />
              <div className="relative border border-slate-200/50 rounded-[20px] py-2 max-h-80 overflow-y-auto">
              {models.map((model) => {
                const isDisabled = model.remaining_today === 0
                const isSelected = model.model_id === selectedModel
                
                return (
                  <button
                    key={model.model_id}
                    onClick={() => {
                      if (!isDisabled) {
                        setSelectedModel(model.model_id)
                        setShowModelSelector(false)
                        if (onModelChange) {
                          onModelChange(model.model_id)
                        }
                      }
                    }}
                    disabled={isDisabled}
                    className={`w-full px-3 py-2 text-left transition-colors ${
                      isDisabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : isSelected
                        ? 'bg-white/80'
                        : 'hover:bg-white/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-label-md text-slate-900">
                            {model.display_name}
                            {hasMessages && conversationModel && model.model_id !== conversationModel && (
                              <span className="text-slate-600 text-label-sm ml-1">(New Chat)</span>
                            )}
                          </span>
                          {isSelected && <span className="text-blue-600">✓</span>}
                        </div>
                        <div className="text-label-sm text-slate-600 mt-1">
                          {model.daily_limit === null ? (
                            'Unlimited'
                          ) : model.remaining_today === 0 ? (
                            <span className="text-red-500">Daily limit reached</span>
                          ) : (
                            `${model.remaining_today}/${model.daily_limit} remaining`
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        {getTierBadge(model.tier_required)}
                      </div>
                    </div>
                  </button>
                )
              })}
              </div>
            </div>
          )}
        </div>
        
          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={(!message.trim() && allFiles.length === 0) || isLoading || !selectedModel || uploading}
            className="w-[35px] h-[35px] bg-slate-900/90 backdrop-blur-sm rounded-[12px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
            aria-label="Send message"
          >
            <SendIcon className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
      </div>
      
      {/* File preview - now outside and below the input */}
      {hasAttachments && (
        <div className="mt-2">
          <FilePreview 
            files={allFiles}
            onRemove={handleRemoveFile}
            uploading={uploading}
            uploadProgress={uploadProgress}
          />
        </div>
      )}
    </div>
  )
}