import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TransactionWithApp } from '@ampel/shared/types/shares';
import { useTransactions } from '@/hooks/useEquity';
import { useAuthContext } from '@/contexts/AuthContext';
import { TransactionItem } from '@/components/wallet/TransactionItem';
import { TransactionDetailModal } from '@/components/wallet/TransactionDetailModal';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';

/**
 * Transaction History Screen
 * Complete paginated transaction history with infinite scroll
 *
 * Features:
 * - All transactions display
 * - Infinite scroll pagination
 * - Pull-to-refresh
 * - Tap transaction to view details
 * - Loading states
 * - Empty state for new users
 */
export default function TransactionHistoryScreen() {
  const { user } = useAuthContext();
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTransactions(user?.id);

  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithApp | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Flatten paginated data into single array
  const transactions = data?.pages.flatMap((page) => page.transactions) ?? [];

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  /**
   * Handle load more on scroll
   */
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
   * Render transaction item
   */
  const renderItem = useCallback(
    ({ item }: { item: TransactionWithApp }) => (
      <TransactionItem
        transaction={item}
        onPress={() => handleTransactionPress(item)}
      />
    ),
    [handleTransactionPress]
  );

  /**
   * Render loading footer
   */
  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#6B7280" />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  }, [isFetchingNextPage]);

  /**
   * Render end of list indicator
   */
  const renderEndOfList = useCallback(() => {
    if (transactions.length === 0 || hasNextPage) return null;

    return (
      <View style={styles.endOfList}>
        <Text style={styles.endOfListText}>You're all caught up!</Text>
      </View>
    );
  }, [transactions.length, hasNextPage]);

  /**
   * Key extractor
   */
  const keyExtractor = useCallback((item: TransactionWithApp) => item.id, []);

  // Loading state
  if (isLoading) {
    return <LoadingState message="Loading transactions..." />;
  }

  // Empty state
  if (!isLoading && transactions.length === 0) {
    return (
      <EmptyState
        icon="list"
        title="No Transactions Yet"
        message="Your transaction history will appear here once you start earning equity."
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transaction History</Text>
      </View>

      {/* Transaction List */}
      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          <>
            {renderFooter()}
            {renderEndOfList()}
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6B7280"
          />
        }
        showsVerticalScrollIndicator={false}
        maxToRenderPerBatch={10}
        windowSize={21}
        removeClippedSubviews={true}
      />

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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  endOfList: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  endOfListText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
