import { useState, useCallback, useEffect } from 'react';
import { Message } from '@/components/chat/ChatInterface';
import { generateSafeTitle } from '@/lib/utils/chatNaming';

interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model: string;
  total_tokens_used: number;
  last_message_at: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

interface UseConversationReturn {
  conversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  createConversation: (firstMessage: string, model: string) => Promise<Conversation | null>;
  loadConversation: (id: string) => Promise<void>;
  saveMessage: (message: Omit<Message, 'id'>, conversationId?: string) => Promise<void>;
  updateConversation: (updates: Partial<Conversation>) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  clearConversation: () => void;
}

export function useConversation(initialConversationId?: string): UseConversationReturn {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversation on mount if ID provided
  useEffect(() => {
    if (initialConversationId) {
      loadConversation(initialConversationId);
    }
  }, [initialConversationId]);

  const createConversation = useCallback(async (firstMessage: string, model: string): Promise<Conversation | null> => {
    try {
      setError(null);
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          firstMessage,
          model 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create conversation');
      }

      const newConversation = await response.json();
      setConversation(newConversation);
      return newConversation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(message);
      console.error('Error creating conversation:', err);
      return null;
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/conversations/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }

      const { conversation, messages: dbMessages } = await response.json();
      
      setConversation(conversation);
      
      // Convert database messages to chat interface format
      const formattedMessages: Message[] = dbMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        model: msg.model,
        timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })
      }));
      
      setMessages(formattedMessages);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load conversation';
      setError(message);
      console.error('Error loading conversation:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveMessage = useCallback(async (message: Omit<Message, 'id'>, conversationId?: string) => {
    try {
      const convId = conversationId || conversation?.id;
      if (!convId) {
        throw new Error('No conversation ID available');
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: convId,
          role: message.role,
          content: message.content,
          model: message.model,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save message');
      }

      const savedMessage = await response.json();
      
      // Update local messages with the saved message
      const newMessage: Message = {
        id: savedMessage.id,
        role: savedMessage.role,
        content: savedMessage.content,
        model: savedMessage.model,
        timestamp: new Date(savedMessage.created_at).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })
      };
      
      setMessages(prev => [...prev, newMessage]);
    } catch (err) {
      console.error('Error saving message:', err);
      // Don't throw - we want to continue even if save fails
    }
  }, [conversation]);

  const updateConversation = useCallback(async (updates: Partial<Conversation>) => {
    if (!conversation) return;

    try {
      const response = await fetch(`/api/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update conversation');
      }

      const updated = await response.json();
      setConversation(updated);
    } catch (err) {
      console.error('Error updating conversation:', err);
    }
  }, [conversation]);

  const deleteMessage = useCallback(async (messageId: string) => {
    // For now, just remove from local state
    // Add API call when message deletion endpoint is created
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  const clearConversation = useCallback(() => {
    setConversation(null);
    setMessages([]);
    setError(null);
  }, []);

  return {
    conversation,
    messages,
    isLoading,
    error,
    createConversation,
    loadConversation,
    saveMessage,
    updateConversation,
    deleteMessage,
    clearConversation,
  };
}