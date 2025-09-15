import { useState, useCallback, useEffect } from 'react';

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

interface UseConversationListReturn {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  total: number;
  fetchConversations: (archived?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useConversationList(): UseConversationListReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchConversations = useCallback(async (archived: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        archived: archived.toString(),
        limit: '50'
      });
      
      const response = await fetch(`/api/conversations/list?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const { conversations, total } = await response.json();
      setConversations(conversations);
      setTotal(total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(message);
      console.error('Error fetching conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchConversations(false);
  }, [fetchConversations]);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations(false);
  }, []);

  return {
    conversations,
    isLoading,
    error,
    total,
    fetchConversations,
    refresh,
  };
}