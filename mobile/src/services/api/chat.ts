import { supabase } from '@/services/supabase';
import { getDefaultModelId } from './ai';

/**
 * Chat Operations Service
 * Handles all chat-related database operations
 *
 * Note: AI streaming is now handled by the useChat hook in ChatScreen
 * using the /api/chat endpoint
 */

// Types
export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used?: number;
  model?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  model: string;
  total_tokens_used: number;
  last_message_at?: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all messages for a conversation
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Chat] Error fetching messages:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[Chat] getMessages error:', error);
    return []; // Return empty array on error
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(
  userId: string,
  title?: string,
  modelId?: string
): Promise<Conversation> {
  const model = modelId || getDefaultModelId();

  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: title || 'New Conversation',
        model,
        total_tokens_used: 0,
      } as any)
      .select()
      .single() as { data: Conversation | null; error: any };

    if (error || !data) {
      throw new Error('Failed to create conversation: ' + error?.message);
    }

    console.log('[Chat] Conversation created:', data!.id);
    return data!;
  } catch (error) {
    console.error('[Chat] createConversation error:', error);
    throw error;
  }
}

/**
 * Get a conversation by ID
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('[Chat] Error fetching conversation:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[Chat] getConversation error:', error);
    return null;
  }
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(
  userId: string,
  includeArchived = false
): Promise<Conversation[]> {
  try {
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId);

    // Only filter by archived if we don't want archived conversations
    if (!includeArchived) {
      query = query.eq('archived', false);
    }

    const { data, error } = await query.order('last_message_at', {
      ascending: false,
      nullsFirst: false,
    });

    if (error) {
      console.error('[Chat] Error fetching conversations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[Chat] getUserConversations error:', error);
    return [];
  }
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('conversations')
      // @ts-ignore - Supabase type inference issue, update is valid
      .update({ title })
      .eq('id', conversationId);

    if (error) {
      throw error;
    }

    console.log('[Chat] Conversation title updated');
  } catch (error) {
    console.error('[Chat] updateConversationTitle error:', error);
    throw error;
  }
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    // Messages will be deleted automatically due to CASCADE foreign key
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      throw error;
    }

    console.log('[Chat] Conversation deleted');
  } catch (error) {
    console.error('[Chat] deleteConversation error:', error);
    throw error;
  }
}

/**
 * Archive a conversation
 */
export async function archiveConversation(conversationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('conversations')
      // @ts-ignore - Supabase type inference issue, update is valid
      .update({ archived: true })
      .eq('id', conversationId);

    if (error) {
      throw error;
    }

    console.log('[Chat] Conversation archived');
  } catch (error) {
    console.error('[Chat] archiveConversation error:', error);
    throw error;
  }
}

/**
 * Unarchive a conversation
 */
export async function unarchiveConversation(conversationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('conversations')
      // @ts-ignore - Supabase type inference issue, update is valid
      .update({ archived: false })
      .eq('id', conversationId);

    if (error) {
      throw error;
    }

    console.log('[Chat] Conversation unarchived');
  } catch (error) {
    console.error('[Chat] unarchiveConversation error:', error);
    throw error;
  }
}

/**
 * Toggle archive status of a conversation
 */
export async function updateConversationArchived(
  conversationId: string,
  archived: boolean
): Promise<void> {
  try {
    const { error } = await supabase
      .from('conversations')
      // @ts-ignore - Supabase type inference issue, update is valid
      .update({ archived })
      .eq('id', conversationId);

    if (error) {
      throw error;
    }

    console.log(`[Chat] Conversation ${archived ? 'archived' : 'unarchived'}`);
  } catch (error) {
    console.error('[Chat] updateConversationArchived error:', error);
    throw error;
  }
}

/**
 * Generate a conversation title from the first message
 * Takes the first 50 characters of the message
 */
export function generateTitle(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= 50) {
    return trimmed;
  }
  return trimmed.substring(0, 50) + '...';
}

/**
 * Subscribe to conversation updates via Supabase realtime
 * @param userId - User ID to filter conversations by
 * @param callback - Callback function when a conversation changes
 * @returns Unsubscribe function
 */
export function subscribeToConversations(
  userId: string,
  callback: (conversation: Conversation) => void
): () => void {
  const channel = supabase
    .channel('conversations-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('[Chat] Conversation change:', payload);
        if (payload.new && typeof payload.new === 'object') {
          callback(payload.new as Conversation);
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    console.log('[Chat] Unsubscribing from conversation updates');
    supabase.removeChannel(channel);
  };
}

/**
 * Delete a single message
 */
export async function deleteMessage(messageId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      throw error;
    }

    console.log('[Chat] Message deleted');
  } catch (error) {
    console.error('[Chat] deleteMessage error:', error);
    throw error;
  }
}
