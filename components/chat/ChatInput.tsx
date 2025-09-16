'use client'

import React, { useState, useRef, KeyboardEvent, useEffect, useCallback } from 'react'
import { SendIcon, ChevronDownIcon } from '@/components/icons'
import { ModelConfig } from '@/lib/ai/types'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Crown, Zap } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string, model: string) => void
  isLoading?: boolean
  selectedModelId?: string
  onModelChange?: (model: string) => void
  conversationModel?: string | null
  hasMessages?: boolean
}

export function ChatInput({ onSend, isLoading = false, selectedModelId, onModelChange, conversationModel, hasMessages }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [models, setModels] = useState<ModelConfig[]>([])
  const [selectedModel, setSelectedModel] = useState<string>(selectedModelId || 'gemini-2.5-flash-lite')
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [loadingModels, setLoadingModels] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    if (message.trim() && !isLoading && selectedModel) {
      onSend(message.trim(), selectedModel)

      // Clear state
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = '20px'
      }
    }
  }


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

  return (
    <div className="w-full px-2 md:px-0 max-w-[803px]">
      {/* Main input container - responsive height and border radius */}
      <div
        className="relative w-full h-[120px] md:h-[134px] rounded-[25px] md:rounded-[30px] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)] transition-all"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          transform: 'translateZ(0)'
        }}
      >
        {/* Textarea */}
        <textarea
        ref={textareaRef}
        value={message}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        className="absolute left-3 md:left-[18px] top-3 md:top-[18px] right-3 md:right-[18px] text-sm md:text-body-md text-slate-900 placeholder-slate-700 bg-transparent resize-none focus:outline-none"
        style={{ minHeight: '20px', maxHeight: '90px', height: message ? 'auto' : '20px' }}
        disabled={isLoading}
      />
      
      {/* Bottom Row Container - Model selector and Send button */}
      <div className="absolute bottom-3 md:bottom-[18px] left-3 md:left-[18px] right-3 md:right-[18px] flex items-center justify-end">
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
                <span className="text-xs md:text-label-lg text-slate-700 hidden sm:inline">
                  {currentModel.display_name}
                </span>
                <span className="text-xs md:text-label-lg text-slate-700 sm:hidden">
                  {currentModel.display_name.split(' ')[0]}
                </span>
                <span className="hidden sm:inline">{getTierBadge(currentModel.tier_required)}</span>
              </>
            ) : (
              <span className="text-xs md:text-label-lg text-slate-500">
                {loadingModels ? '...' : 'Model'}
              </span>
            )}
            <ChevronDownIcon className="w-3 md:w-4 h-3 md:h-4 text-slate-600 ml-0.5 md:ml-1" strokeWidth={1} />
          </button>
          
          {showModelSelector && models.length > 0 && (
            <div 
              className="absolute bottom-full right-0 mb-2 w-64 max-w-[calc(100vw-2rem)] rounded-[20px] shadow-xl z-50 overflow-hidden"
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
            disabled={!message.trim() || isLoading || !selectedModel}
            className="w-[35px] h-[35px] bg-slate-900/90 backdrop-blur-sm rounded-[12px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
            aria-label="Send message"
          >
            <SendIcon className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}