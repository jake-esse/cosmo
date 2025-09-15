'use client'

import React, { useState, memo } from 'react'
import { Edit2, Check, X } from 'lucide-react'
import { FileAttachment } from '@/lib/ai/types'

interface MessageUserProps {
  message: string
  timestamp?: string
  userInitials?: string
  onEdit?: (newMessage: string) => void
  canEdit?: boolean
  attachments?: FileAttachment[]
}

export const MessageUser = memo(function MessageUser({ message, timestamp, userInitials = 'U', onEdit, canEdit = false, attachments }: MessageUserProps) {
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
      className="w-full bg-slate-900 text-white rounded-[30px] p-4 flex gap-3 relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Edit button */}
      {canEdit && !isEditing && isHovered && (
        <button
          onClick={() => setIsEditing(true)}
          className="absolute -top-2 right-2 p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded shadow-md border border-slate-200 dark:border-slate-700 transition-all duration-200"
          title="Edit message"
        >
          <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
      )}

      {/* User Avatar */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
          <span className="text-label-lg text-white">
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
              className="w-full p-2 bg-slate-800 text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-body-md"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-button-sm transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-button-sm transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-body-md text-white whitespace-pre-wrap break-words">
              {message}
            </p>
            {/* Display attachments if any */}
            {attachments && attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((attachment, index) => (
                  <div 
                    key={`${attachment.id}-${index}`}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-xs text-slate-300"
                  >
                    <span className="font-mono">{attachment.fileName}</span>
                    {attachment.error && (
                      <span className="text-red-400 ml-1">(Error)</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})