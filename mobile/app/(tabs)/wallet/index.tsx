import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { TransactionWithApp } from '@ampel/shared/types/shares';
import { useBalance, useTransactions } from '@/hooks/useEquity';
import { useAuthContext } from '@/contexts/AuthContext';
import { BalanceCard } from '@/components/wallet/BalanceCard';
import { TransactionItem } from '@/components/wallet/TransactionItem';
import { TransactionDetailModal } from '@/components/wallet/TransactionDetailModal';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';

/**
 * Wallet Screen
 * Primary wallet view showing balance and recent activity
 *
 * Features:
 * - Balance card with stats
 * - Last 10 transactions
 * - Pull-to-refresh
 * - Navigate to full history
 * - Transaction detail modal
 */
export default function WalletScreen() {
  const router = useRouter();
  const { user } = useAuthContext();

  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
    refetch: refetchBalance,
  } = useBalance(user?.id);

  const {
    data: transactionsData,
    isLoading: isTransactionsLoading,
    isError: isTransactionsError,
    refetch: refetchTransactions,
  } = useTransactions(user?.id);

  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithApp | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Get recent transactions (max 10)
  const recentTransactions = transactionsData?.pages[0]?.transactions.slice(0, 10) ?? [];

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchBalance(), refetchTransactions()]);
    setRefreshing(false);
  }, [refetchBalance, refetchTransactions]);

  /**
   * Handle transaction press
   */
  const handleTransactionPress = useCallback((transaction: TransactionWithApp) => {
    setSelectedTransaction(transaction);
    setModalVisible(true);
  }, []);

  /**
   * Handle modal close
   */
  const handleModalClose = useCallback(() => {
    setModalVisible(false);
    setSelectedTransaction(null);
  }, []);

  /**
   * Navigate to transaction history
   */
  const handleViewAll = useCallback(() => {
    router.push('/(tabs)/wallet/history');
  }, [router]);

  /**
   * Navigate to chat (for empty state)
   */
  const handleStartChatting = useCallback(() => {
    router.push('/(tabs)/chat');
  }, [router]);

  /**
   * Render transaction item
   */
  const renderTransactionItem = useCallback(
    ({ item }: { item: TransactionWithApp }) => (
      <TransactionItem
        transaction={item}
        onPress={() => handleTransactionPress(item)}
      />
    ),
    [handleTransactionPress]
  );

  /**
   * Key extractor
   */
  const keyExtractor = useCallback((item: TransactionWithApp) => item.id, []);

  // Loading state
  if (isBalanceLoading || isTransactionsLoading) {
    return <LoadingState message="Loading wallet..." />;
  }

  // Error state
  if (isBalanceError || isTransactionsError) {
    return (
      <EmptyState
        icon="alert-circle"
        title="Unable to Load Wallet"
        message="There was an error loading your wallet. Please try again."
        actionLabel="Retry"
        onAction={handleRefresh}
      />
    );
  }

  // Empty state (no transactions)
  if (recentTransactions.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#6B7280"
            />
          }
        >
          {/* Balance Card */}
          <BalanceCard
            balance={balanceData?.total_balance ?? 0}
            earned={balanceData?.total_earned ?? 0}
            spent={balanceData?.total_spent ?? 0}
            animated
          />

          {/* Empty State */}
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="credit-card"
              title="Start Earning Equity"
              message="Chat with Claude to earn your first points. Every interaction counts!"
              actionLabel="Start Chatting"
              onAction={handleStartChatting}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6B7280"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        <BalanceCard
          balance={balanceData?.total_balance ?? 0}
          earned={balanceData?.total_earned ?? 0}
          spent={balanceData?.total_spent ?? 0}
          animated
        />

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsContainer}>
          <FlatList
            data={recentTransactions}
            renderItem={renderTransactionItem}
            keyExtractor={keyExtractor}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* View All Button */}
        {recentTransactions.length > 0 && (
          <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAll}>
            <Text style={styles.viewAllButtonText}>View All Transactions</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        visible={modalVisible}
        transaction={selectedTransaction}
        onClose={handleModalClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  transactionsContainer: {
    backgroundColor: '#FFFFFF',
  },
  viewAllButton: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  viewAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
});
