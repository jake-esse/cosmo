import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserConversations,
  createConversation,
  deleteConversation,
  updateConversationArchived,
  subscribeToConversations,
  type Conversation,
} from '@/services/api/chat';

/**
 * Query key factory for conversations
 */
const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (userId: string, includeArchived: boolean) =>
    [...conversationKeys.lists(), userId, includeArchived] as const,
};

/**
 * Hook to fetch and manage conversations with real-time updates
 * @param userId - User ID to fetch conversations for
 * @param includeArchived - Whether to include archived conversations
 */
export function useConversations(userId: string | undefined, includeArchived = false) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: conversationKeys.list(userId || '', includeArchived),
    queryFn: () => {
      if (!userId) {
        throw new Error('User ID is required to fetch conversations');
      }
      return getUserConversations(userId, includeArchived);
    },
    enabled: !!userId, // Only run query if userId is available
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToConversations(userId, (updatedConversation) => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
    });

    return unsubscribe;
  }, [userId, queryClient]);

  return query;
}

/**
 * Hook to create a new conversation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      title,
      modelId,
    }: {
      userId: string;
      title?: string;
      modelId?: string;
    }) => createConversation(userId, title, modelId),
    onSuccess: () => {
      // Invalidate conversations query to refetch
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
    },
    onError: (error) => {
      console.error('[useCreateConversation] Error creating conversation:', error);
      Alert.alert('Error', 'Failed to create conversation. Please try again.');
    },
  });
}

/**
 * Hook to delete a conversation with confirmation
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => deleteConversation(conversationId),
    onSuccess: () => {
      // Invalidate conversations query to refetch
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
    },
    onError: (error) => {
      console.error('[useDeleteConversation] Error deleting conversation:', error);
      Alert.alert('Error', 'Failed to delete conversation. Please try again.');
    },
  });
}

/**
 * Helper to show delete confirmation and execute deletion
 */
export function confirmDeleteConversation(
  conversationId: string,
  deleteMutation: ReturnType<typeof useDeleteConversation>
) {
  Alert.alert(
    'Delete Conversation',
    'Are you sure you want to delete this conversation? This cannot be undone.',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(conversationId),
      },
    ],
    { cancelable: true }
  );
}

/**
 * Hook to archive/unarchive a conversation
 */
export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      archived,
    }: {
      conversationId: string;
      archived: boolean;
    }) => updateConversationArchived(conversationId, archived),
    // Optimistically update the UI
    onMutate: async ({ conversationId, archived }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: conversationKeys.lists() });

      // Snapshot the previous value
      const previousConversations = queryClient.getQueriesData({
        queryKey: conversationKeys.lists(),
      });

      // Optimistically update all conversation queries
      queryClient.setQueriesData({ queryKey: conversationKeys.lists() }, (old: any) => {
        if (!old) return old;
        return old.map((conv: Conversation) =>
          conv.id === conversationId ? { ...conv, archived } : conv
        );
      });

      // Return context with previous data for rollback
      return { previousConversations };
    },
    // On error, rollback to previous state
    onError: (error, variables, context) => {
      console.error('[useArchiveConversation] Error archiving conversation:', error);
      if (context?.previousConversations) {
        context.previousConversations.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      Alert.alert('Error', 'Failed to archive conversation. Please try again.');
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
    },
  });
}
