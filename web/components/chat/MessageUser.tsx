'use client'

import React, { useState, memo } from 'react'
import { Edit2, Check, X } from 'lucide-react'

interface MessageUserProps {
  message: string
  timestamp?: string
  userInitials?: string
  onEdit?: (newMessage: string) => void
  canEdit?: boolean
}

export const MessageUser = memo(function MessageUser({ message, timestamp, userInitials = 'U', onEdit, canEdit = false }: MessageUserProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedMessage, setEditedMessage] = useState(message)
  const [isHovered, setIsHovered] = useState(false)

  const handleSave = () => {
    if (editedMessage.trim() && editedMessage !== message && onEdit) {
      onEdit(editedMessage.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedMessage(message)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <div
      className="w-full bg-[#EEF4F5] text-slate-900 rounded-[20px] p-4 flex gap-3 relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Edit button */}
      {canEdit && !isEditing && isHovered && (
        <button
          onClick={() => setIsEditing(true)}
          className="absolute -top-2 right-2 p-1.5 bg-[#2A341D] hover:bg-[#1F2816] rounded-full shadow-md transition-all duration-200"
          title="Edit message"
        >
          <Edit2 className="w-4 h-4 text-white" />
        </button>
      )}

      {/* User Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-[#2A341D] rounded-full flex items-center justify-center">
          <span className="text-sm font-medium text-white">
            {userInitials}
          </span>
        </div>
      </div>
      
      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-3 bg-white text-slate-900 rounded-[12px] resize-none focus:outline-none focus:ring-2 focus:ring-[#2A341D] text-[15px] leading-relaxed border border-slate-200"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#2A341D] hover:bg-[#1F2816] text-white rounded-[12px] text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-[12px] text-sm font-medium transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[15px] leading-relaxed text-slate-900 whitespace-pre-wrap break-words">
              {message}
            </p>
          </div>
        )}
      </div>
    </div>
  )
})