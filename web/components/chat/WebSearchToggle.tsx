'use client'

import React, { useState } from 'react'
import { Globe } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface WebSearchToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}

export function WebSearchToggle({ enabled, onChange, disabled = false }: WebSearchToggleProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={() => onChange(!enabled)}
            disabled={disabled}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="w-[35px] h-[35px] rounded-[12px] flex items-center justify-center transition-all duration-200 relative overflow-hidden"
            style={{
              background: enabled
                ? 'linear-gradient(135deg, rgba(238, 244, 245, 1) 0%, rgba(219, 234, 236, 1) 100%)'
                : isHovered
                ? 'linear-gradient(135deg, rgba(238, 244, 245, 0.75) 0%, rgba(219, 234, 236, 0.75) 100%)'
                : 'linear-gradient(135deg, rgba(238, 244, 245, 0) 0%, rgba(219, 234, 236, 0) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: enabled ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(128, 128, 128, 0.15)',
              opacity: disabled ? 0.5 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
            aria-label={enabled ? 'Disable web search' : 'Enable web search'}
            aria-pressed={enabled}
          >
            <Globe
              className="w-5 h-5"
              style={{
                color: enabled ? '#3b82f6' : '#64748b',
              }}
              strokeWidth={1.5}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="px-3 py-2 rounded-xl"
          style={{
            backgroundColor: '#2A341D',
            color: 'white',
            border: 'none'
          }}
          sideOffset={8}
        >
          <span className="text-white text-sm font-medium">
            Web Search
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}