import { useEffect } from 'react';
import { Platform } from 'react-native';
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  getUserBalance,
  getTransactions,
  getReferralCode,
  subscribeToBalance,
  trackInteraction,
  type UserBalance,
  type TransactionPaginationOptions,
} from '@/services/api/equity';

/**
 * Equity Query Keys
 * Centralized query key factory for consistency
 */
export const equityKeys = {
  all: ['equity'] as const,
  balances: () => [...equityKeys.all, 'balance'] as const,
  balance: (userId: string) => [...equityKeys.balances(), userId] as const,
  transactions: () => [...equityKeys.all, 'transactions'] as const,
  transactionList: (userId: string) =>
    [...equityKeys.transactions(), userId] as const,
  referralCodes: () => [...equityKeys.all, 'referralCode'] as const,
  referralCode: (userId: string) =>
    [...equityKeys.referralCodes(), userId] as const,
};

/**
 * Hook to fetch and subscribe to user balance
 *
 * Features:
 * - Fetches balance on mount
 * - Subscribes to real-time updates via Supabase
 * - Caches for 5 minutes
 * - Refetches on window focus
 * - Auto-updates when new transactions occur
 *
 * @param userId - User ID
 * @returns Query result with balance data
 */
export function useBalance(userId: string | undefined) {
  const queryClient = useQueryClient();

  // Balance query
  const query = useQuery({
    queryKey: equityKeys.balance(userId || ''),
    queryFn: () => {
      if (!userId) {
        throw new Error('User ID is required to fetch balance');
      }
      return getUserBalance(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    console.log('[useBalance] Setting up real-time subscription');

    const unsubscribe = subscribeToBalance(userId, (newBalance) => {
      console.log('[useBalance] Received balance update:', newBalance);

      // Update React Query cache optimistically
      queryClient.setQueryData<UserBalance>(
        equityKeys.balance(userId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            total_balance: newBalance,
          };
        }
      );

      // Invalidate to refetch full data (includes total_earned, etc.)
      queryClient.invalidateQueries({ queryKey: equityKeys.balance(userId) });
    });

    return () => {
      console.log('[useBalance] Cleaning up subscription');
      unsubscribe();
    };
  }, [userId, queryClient]);

  return query;
}

/**
 * Hook for paginated transaction history
 *
 * Features:
 * - Infinite scroll support
 * - 20 transactions per page
 * - Caches pages independently
 * - Auto-refetches on new transactions
 *
 * @param userId - User ID
 * @returns Infinite query result with transactions
 */
export function useTransactions(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: equityKeys.transactionList(userId || ''),
    queryFn: ({ pageParam = 0 }) => {
      if (!userId) {
        throw new Error('User ID is required to fetch transactions');
      }
      return getTransactions(userId, { page: pageParam, limit: 20 });
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 0,
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to fetch referral code
 *
 * Features:
 * - Caches indefinitely (referral codes don't change)
 * - Only fetches once per user
 *
 * @param userId - User ID
 * @returns Query result with referral code
 */
export function useReferralCode(userId: string | undefined) {
  return useQuery({
    queryKey: equityKeys.referralCode(userId || ''),
    queryFn: () => {
      if (!userId) {
        throw new Error('User ID is required to fetch referral code');
      }
      return getReferralCode(userId);
    },
    enabled: !!userId,
    staleTime: Infinity, // Referral codes never change
  });
}

/**
 * Mutation hook to track interactions
 *
 * Features:
 * - Optimistically updates balance
 * - Invalidates balance query on success
 * - Shows haptic feedback on iOS
 * - Error handling with rollback
 *
 * @returns Mutation hook
 */
export function useTrackInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      actionType,
      amount,
      requestId,
      description,
      appId,
    }: {
      userId: string;
      actionType: string;
      amount: number;
      requestId: string;
      description?: string;
      appId?: string | null;
    }) => trackInteraction(userId, actionType, amount, requestId, description, appId),

    // Optimistic update
    onMutate: async ({ userId, amount }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: equityKeys.balance(userId) });

      // Snapshot previous value
      const previousBalance = queryClient.getQueryData<UserBalance>(
        equityKeys.balance(userId)
      );

      // Optimistically update balance
      if (previousBalance) {
        queryClient.setQueryData<UserBalance>(equityKeys.balance(userId), {
          ...previousBalance,
          total_balance: previousBalance.total_balance + amount,
          total_earned: previousBalance.total_earned + amount,
          transaction_count: previousBalance.transaction_count + 1,
        });
      }

      // Trigger haptic feedback immediately for better UX
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      return { previousBalance };
    },

    // On error, rollback to previous state
    onError: (error, variables, context) => {
      console.error('[useTrackInteraction] Error tracking interaction:', error);
      if (context?.previousBalance) {
        queryClient.setQueryData(
          equityKeys.balance(variables.userId),
          context.previousBalance
        );
      }
    },

    // Always refetch after success or error to ensure consistency
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({
        queryKey: equityKeys.balance(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: equityKeys.transactionList(variables.userId),
      });
    },

    // Log success
    onSuccess: (data, variables) => {
      console.log('[useTrackInteraction] Interaction tracked successfully:', {
        actionType: variables.actionType,
        amount: variables.amount,
        newBalance: data.newBalance,
      });
    },
  });
}

/**
 * Helper hook to track daily active bonus
 * Can be used in App.tsx or anywhere needed
 *
 * @param userId - User ID
 * @returns Mutation to trigger daily active tracking
 */
export function useTrackDailyActive(userId: string | undefined) {
  const trackMutation = useTrackInteraction();

  const trackDailyActive = async () => {
    if (!userId) return;

    const today = new Date().toDateString();
    const requestId = `daily-${userId}-${today}`;

    await trackMutation.mutateAsync({
      userId,
      actionType: 'daily_active',
      amount: 10,
      requestId,
      description: 'Daily active bonus',
      appId: null,
    });
  };

  return {
    trackDailyActive,
    isPending: trackMutation.isPending,
  };
}

/**
 * Helper hook to track chat message
 * Can be used in ChatScreen after message sent
 *
 * @param userId - User ID
 * @param conversationId - Conversation ID
 * @returns Mutation to trigger chat message tracking
 */
export function useTrackChatMessage(
  userId: string | undefined,
  conversationId: string
) {
  const trackMutation = useTrackInteraction();

  const trackChatMessage = async () => {
    if (!userId) return;

    const requestId = `chat-${conversationId}-${Date.now()}-${Math.random()}`;

    await trackMutation.mutateAsync({
      userId,
      actionType: 'app_usage',
      amount: 1,
      requestId,
      description: 'Chat message sent',
      appId: null,
    });
  };

  return {
    trackChatMessage,
    isPending: trackMutation.isPending,
  };
}
