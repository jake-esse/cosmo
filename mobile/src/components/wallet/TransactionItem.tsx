import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { TransactionWithApp } from '@ampel/shared/types/shares';
import { TransactionTypeIcon } from './TransactionTypeIcon';

/**
 * Transaction Item Props
 */
export interface TransactionItemProps {
  transaction: TransactionWithApp;
  onPress: () => void;
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  // Format as "MMM DD, YYYY" for older dates
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  return `${month} ${day}, ${year}`;
}

/**
 * Transaction Item Component
 * List item for displaying a transaction
 *
 * Features:
 * - Icon based on transaction description
 * - Description and relative timestamp
 * - Amount with +/- and color coding
 * - Touch feedback
 *
 * @param transaction - Transaction data
 * @param onPress - Callback when item is pressed
 */
export const TransactionItem = React.memo(function TransactionItem({
  transaction,
  onPress,
}: TransactionItemProps) {
  const relativeTime = useMemo(
    () => formatRelativeTime(transaction.created_at),
    [transaction.created_at]
  );

  // Determine amount color and prefix
  const isPositive = transaction.amount > 0;
  const amountColor = isPositive ? '#10B981' : '#EF4444'; // Green or Red
  const amountPrefix = isPositive ? '+' : '-';
  const displayAmount = Math.abs(transaction.amount);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <TransactionTypeIcon description={transaction.description || ''} size={40} />

      {/* Middle content */}
      <View style={styles.middleContent}>
        <Text style={styles.description} numberOfLines={1}>
          {transaction.description || 'Transaction'}
        </Text>
        <Text style={styles.timestamp}>{relativeTime}</Text>
      </View>

      {/* Right content - Amount */}
      <View style={styles.rightContent}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {amountPrefix}{displayAmount}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  middleContent: {
    flex: 1,
    marginLeft: 12,
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 14,
    color: '#6B7280',
  },
  rightContent: {
    marginLeft: 12,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
