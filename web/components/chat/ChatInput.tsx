'use client'

import React, { useState, useRef, KeyboardEvent, useEffect } from 'react'
import { SendIcon } from '@/components/icons'
import { ReasoningToggle } from './ReasoningToggle'
import { WebSearchToggle } from './WebSearchToggle'

interface ChatInputProps {
  onSend: (message: string, reasoning: boolean, webSearch: boolean) => void
  isLoading?: boolean
  reasoning?: boolean
  onReasoningChange?: (reasoning: boolean) => void
  webSearch?: boolean
  onWebSearchChange?: (webSearch: boolean) => void
  hasMessages?: boolean
}

export function ChatInput({
  onSend,
  isLoading = false,
  reasoning = false,
  onReasoningChange,
  webSearch = false,
  onWebSearchChange,
  hasMessages = false
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [localReasoning, setLocalReasoning] = useState(reasoning)
  const [localWebSearch, setLocalWebSearch] = useState(webSearch)
  const [textareaHeight, setTextareaHeight] = useState(20)
  const [containerHeight, setContainerHeight] = useState(134) // Default to desktop height
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Update local states when props change
  useEffect(() => {
    setLocalReasoning(reasoning)
  }, [reasoning])

  useEffect(() => {
    setLocalWebSearch(webSearch)
  }, [webSearch])

  // Fix initial textarea height to prevent placeholder cutoff and calculate container height
  useEffect(() => {
    if (textareaRef.current && !message) {
      textareaRef.current.style.height = '20px'
      setTextareaHeight(20)
    }

    // Calculate container height based on window width (client-side only)
    const updateContainerHeight = () => {
      const baseHeight = window.innerWidth >= 768 ? 134 : 120
      const extraHeight = Math.max(0, textareaHeight - 20)
      setContainerHeight(baseHeight + extraHeight)
    }

    updateContainerHeight()
    window.addEventListener('resize', updateContainerHeight)
    return () => window.removeEventListener('resize', updateContainerHeight)
  }, [textareaHeight, message])

  const handleReasoningChange = (enabled: boolean) => {
    setLocalReasoning(enabled)
    if (onReasoningChange) {
      onReasoningChange(enabled)
    }
  }

  const handleWebSearchChange = (enabled: boolean) => {
    setLocalWebSearch(enabled)
    if (onWebSearchChange) {
      onWebSearchChange(enabled)
    }
  }

  const handleSend = async () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim(), localReasoning, localWebSearch)

      // Clear state
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = '20px'
        setTextareaHeight(20)
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
    // Auto-resize textarea with max height of 200px
    if (textareaRef.current) {
      textareaRef.current.style.height = '20px'
      const scrollHeight = textareaRef.current.scrollHeight
      const newHeight = Math.min(scrollHeight, 200)
      textareaRef.current.style.height = `${newHeight}px`
      setTextareaHeight(newHeight)
    }
  }

  return (
    <div className="w-full px-2 md:px-0 max-w-[803px]">
      {/* Main input container with dynamic height */}
      <div
        className="relative w-full rounded-[25px] md:rounded-[30px] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)] transition-all duration-300"
        style={{
          height: `${containerHeight}px`,
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(128, 128, 128, 0.15)',
          transform: 'translateZ(0)',
          transformOrigin: hasMessages ? 'bottom center' : 'top center'
        }}
      >
        {/* Textarea container that grows with content */}
        <div
          className="absolute left-3 md:left-[18px] top-3 md:top-[18px] right-3 md:right-[18px] overflow-y-auto"
          style={{
            bottom: '53px', // Reduced from 60px to match top spacing better (35px button + 18px padding)
            maxHeight: `${textareaHeight}px`
          }}
        >
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="w-full text-sm md:text-body-md text-slate-900 placeholder-slate-700 bg-transparent resize-none focus:outline-none"
            style={{
              height: `${textareaHeight}px`,
              minHeight: '20px',
              maxHeight: '200px'
            }}
            disabled={isLoading}
          />
        </div>

        {/* Bottom Row Container - Toggles and Send button */}
        <div className="absolute bottom-3 md:bottom-[18px] left-3 md:left-[18px] right-3 md:right-[18px] flex items-center justify-between">
          {/* Toggles on left */}
          <div className="flex items-center gap-2">
            <ReasoningToggle
              enabled={localReasoning}
              onChange={handleReasoningChange}
              disabled={isLoading}
            />
            <WebSearchToggle
              enabled={localWebSearch}
              onChange={handleWebSearchChange}
              disabled={isLoading}
            />
          </div>

          {/* Send Button on right */}
          <div className="flex items-center">
            <button
              onClick={handleSend}
              disabled={!message.trim() || isLoading}
              className="w-[35px] h-[35px] bg-[#2A341D] backdrop-blur-sm rounded-[12px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1F2816] transition-colors"
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