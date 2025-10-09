import { supabase } from '@/services/supabase';
import type {
  EquityTransaction,
  TransactionWithApp,
} from '@ampel/shared/types/shares';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Equity Service
 * Handles all equity-related operations for mobile app
 *
 * Features:
 * - Balance fetching via database function
 * - Paginated transaction history
 * - Real-time balance updates via subscriptions
 * - Idempotent point tracking
 * - Referral code management
 */

/**
 * User balance data structure
 */
export interface UserBalance {
  total_balance: number;
  total_earned: number;
  total_spent: number;
  transaction_count: number;
  last_transaction_at: string | null;
  referral_earnings: number;
}

/**
 * Transaction pagination options
 */
export interface TransactionPaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * Paginated transactions response
 */
export interface PaginatedTransactions {
  transactions: TransactionWithApp[];
  hasMore: boolean;
  totalCount: number;
  page: number;
}

/**
 * Get user's current equity balance
 * Uses database function: get_user_balance(p_user_id)
 *
 * @param userId - User ID
 * @returns Balance data with totals and transaction count
 */
export async function getUserBalance(userId: string): Promise<UserBalance> {
  try {
    const { data, error } = await supabase.rpc('get_user_balance', {
      p_user_id: userId,
    } as any);

    if (error) {
      console.error('[Equity] Error fetching balance:', error);
      throw new Error(`Failed to fetch balance: ${error.message}`);
    }

    if (!data) {
      // Return zero balance if no data
      return {
        total_balance: 0,
        total_earned: 0,
        total_spent: 0,
        transaction_count: 0,
        last_transaction_at: null,
        referral_earnings: 0,
      };
    }

    // Parse JSONB response from database function
    const balanceData = data as any;
    return {
      total_balance: Number(balanceData.total_balance) || 0,
      total_earned: Number(balanceData.total_earned) || 0,
      total_spent: Number(balanceData.total_spent) || 0,
      transaction_count: Number(balanceData.transaction_count) || 0,
      last_transaction_at: balanceData.last_transaction_at || null,
      referral_earnings: Number(balanceData.referral_earnings) || 0,
    };
  } catch (error) {
    console.error('[Equity] getUserBalance error:', error);
    throw error;
  }
}

/**
 * Get paginated transaction history
 * Joins with apps table to include app name and icon
 *
 * @param userId - User ID
 * @param options - Pagination options (page, limit)
 * @returns Paginated transactions with app info
 */
export async function getTransactions(
  userId: string,
  options: TransactionPaginationOptions = {}
): Promise<PaginatedTransactions> {
  const { page = 0, limit = 20 } = options;
  const startIndex = page * limit;
  const endIndex = startIndex + limit - 1;

  try {
    // Get total count first
    const { count, error: countError } = await supabase
      .from('equity_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('[Equity] Error counting transactions:', countError);
      throw new Error(`Failed to count transactions: ${countError.message}`);
    }

    const totalCount = count || 0;

    // Fetch transactions with app info
    const { data, error } = await supabase
      .from('equity_transactions')
      .select(`
        *,
        apps:app_id (
          name,
          icon_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(startIndex, endIndex);

    if (error) {
      console.error('[Equity] Error fetching transactions:', error);
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    // Map to TransactionWithApp type
    const transactions: TransactionWithApp[] = (data || []).map((tx: any) => ({
      id: tx.id,
      user_id: tx.user_id,
      app_id: tx.app_id,
      transaction_type: mapTransactionType(tx.transaction_type),
      amount: Number(tx.amount),
      balance_after: Number(tx.balance_after),
      description: tx.description,
      metadata: tx.metadata,
      created_at: tx.created_at,
      // Add app info from join
      app_name: tx.apps?.name || 'Ampel',
      app_icon: tx.apps?.icon_url,
    }));

    const hasMore = endIndex < totalCount - 1;

    return {
      transactions,
      hasMore,
      totalCount,
      page,
    };
  } catch (error) {
    console.error('[Equity] getTransactions error:', error);
    throw error;
  }
}

/**
 * Map database transaction_type to TypeScript type
 * Database uses: 'credit' | 'debit'
 * TypeScript uses: 'earn' | 'spend' | 'transfer' | 'system'
 */
function mapTransactionType(
  dbType: string
): 'earn' | 'spend' | 'transfer' | 'system' {
  if (dbType === 'credit') return 'earn';
  if (dbType === 'debit') return 'spend';
  return 'system';
}

/**
 * Subscribe to real-time balance updates
 * Listens to equity_transactions table for user's transactions
 * Triggers haptic feedback on iOS when new transaction occurs
 *
 * @param userId - User ID to subscribe for
 * @param callback - Called with new balance when transaction occurs
 * @returns Unsubscribe function
 */
export function subscribeToBalance(
  userId: string,
  callback: (newBalance: number) => void
): () => void {
  console.log('[Equity] Subscribing to balance updates for user:', userId);

  const channel = supabase
    .channel(`equity:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'equity_transactions',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('[Equity] New transaction received:', payload);

        // Trigger haptic feedback on iOS
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Extract new balance from transaction
        const newTransaction = payload.new as any;
        if (newTransaction && newTransaction.balance_after) {
          const newBalance = Number(newTransaction.balance_after);
          callback(newBalance);
        }
      }
    )
    .subscribe((status) => {
      console.log('[Equity] Subscription status:', status);
    });

  // Return unsubscribe function
  return () => {
    console.log('[Equity] Unsubscribing from balance updates');
    supabase.removeChannel(channel);
  };
}

/**
 * Track a user interaction that earns equity
 * Calls database function: award_equity_points()
 * Uses idempotent request IDs to prevent duplicate awards
 *
 * @param userId - User ID
 * @param actionType - Type of action (daily_active, app_usage, etc.)
 * @param amount - Points to award
 * @param requestId - Unique ID for idempotency (use UUID)
 * @param description - Human-readable description
 * @param appId - Optional app ID (null = platform equity)
 * @returns Success status and transaction ID
 */
export async function trackInteraction(
  userId: string,
  actionType: string,
  amount: number,
  requestId: string,
  description?: string,
  appId?: string | null
): Promise<{ success: boolean; transactionId?: string; newBalance?: number }> {
  try {
    console.log('[Equity] Tracking interaction:', {
      userId,
      actionType,
      amount,
      requestId,
      description,
    });

    const { data, error } = await supabase.rpc('award_equity_points', {
      p_user_id: userId,
      p_action_type: actionType,
      p_amount: amount,
      p_request_id: requestId,
      p_description: description || null,
      p_app_id: appId || null,
    } as any);

    if (error) {
      console.error('[Equity] Error awarding points:', error);
      throw new Error(`Failed to award points: ${error.message}`);
    }

    console.log('[Equity] Points awarded successfully:', data);

    // Database function returns array with single row: [{ transaction_id, points, new_balance }]
    const resultData = data as any;
    if (resultData && Array.isArray(resultData) && resultData.length > 0) {
      const result = resultData[0];
      return {
        success: true,
        transactionId: result.transaction_id,
        newBalance: Number(result.new_balance),
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[Equity] trackInteraction error:', error);
    return { success: false };
  }
}

/**
 * Get user's referral code
 * Fetches from profiles table
 *
 * @param userId - User ID
 * @returns Referral code string
 */
export async function getReferralCode(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Equity] Error fetching referral code:', error);
      throw new Error(`Failed to fetch referral code: ${error.message}`);
    }

    const profileData = data as any;
    return profileData?.referral_code || null;
  } catch (error) {
    console.error('[Equity] getReferralCode error:', error);
    return null;
  }
}

/**
 * Validate a referral code format
 * Expected format: 8 uppercase alphanumeric characters
 *
 * @param code - Code to validate
 * @returns True if valid format
 */
export function validateReferralCode(code: string): boolean {
  const pattern = /^[A-Z0-9]{8}$/;
  return pattern.test(code.toUpperCase());
}
