'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getModelDisplayName } from '@/lib/ai/tokenizer'

interface ContextLimitDialogProps {
  open: boolean
  modelId: string
  onStartNewChat: () => void
}

export function ContextLimitDialog({ 
  open, 
  modelId, 
  onStartNewChat 
}: ContextLimitDialogProps) {
  const modelName = getModelDisplayName(modelId)
  
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Conversation Length Limit</DialogTitle>
          <DialogDescription className="text-base pt-2">
            This conversation has reached the maximum length for {modelName}. 
            Please start a new chat to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onStartNewChat} className="w-full sm:w-auto">
            Start New Chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}