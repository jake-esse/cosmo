import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { TransactionWithApp } from '@ampel/shared/types/shares';
import { TransactionTypeIcon } from '@/components/wallet/TransactionTypeIcon';

/**
 * Transaction Detail Modal Props
 */
export interface TransactionDetailModalProps {
  visible: boolean;
  transaction: TransactionWithApp | null;
  onClose: () => void;
}

/**
 * Format full timestamp with date and time
 */
function formatFullTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${month} ${day}, ${year} at ${displayHours}:${minutes} ${ampm}`;
}

/**
 * Get transaction type badge config
 */
function getTypeBadge(type: string): { label: string; color: string; bgColor: string } {
  switch (type) {
    case 'earn':
      return { label: 'Earned', color: '#10B981', bgColor: '#D1FAE5' };
    case 'spend':
      return { label: 'Spent', color: '#EF4444', bgColor: '#FEE2E2' };
    case 'transfer':
      return { label: 'Transfer', color: '#3B82F6', bgColor: '#DBEAFE' };
    case 'system':
      return { label: 'System', color: '#6B7280', bgColor: '#F3F4F6' };
    default:
      return { label: 'Unknown', color: '#6B7280', bgColor: '#F3F4F6' };
  }
}

/**
 * Transaction Detail Modal Component
 * Shows detailed view of a single transaction
 *
 * Features:
 * - Complete transaction details
 * - App icon and name if available
 * - Transaction type badge
 * - Amount with color coding
 * - Full timestamp
 * - Balance after transaction
 * - Transaction ID for support
 *
 * @param visible - Whether modal is visible
 * @param transaction - Transaction to display
 * @param onClose - Callback when modal is closed
 */
export function TransactionDetailModal({
  visible,
  transaction,
  onClose,
}: TransactionDetailModalProps) {
  if (!transaction) return null;

  const typeBadge = getTypeBadge(transaction.transaction_type);
  const isPositive = transaction.amount > 0;
  const amountColor = isPositive ? '#10B981' : '#EF4444';
  const amountPrefix = isPositive ? '+' : '-';
  const displayAmount = Math.abs(transaction.amount);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Transaction Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* App Info (if available) */}
          {transaction.app_name && (
            <View style={styles.appContainer}>
              {transaction.app_icon ? (
                <Image source={{ uri: transaction.app_icon }} style={styles.appIcon} />
              ) : (
                <View style={styles.appIconPlaceholder}>
                  <Feather name="package" size={24} color="#6B7280" />
                </View>
              )}
              <Text style={styles.appName}>{transaction.app_name}</Text>
            </View>
          )}

          {/* Transaction Icon */}
          <View style={styles.iconContainer}>
            <TransactionTypeIcon description={transaction.description || ''} size={64} />
          </View>

          {/* Type Badge */}
          <View style={styles.badgeContainer}>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: typeBadge.bgColor },
              ]}
            >
              <Text style={[styles.typeBadgeText, { color: typeBadge.color }]}>
                {typeBadge.label}
              </Text>
            </View>
          </View>

          {/* Amount */}
          <Text style={[styles.amount, { color: amountColor }]}>
            {amountPrefix}{displayAmount} points
          </Text>

          {/* Description */}
          <Text style={styles.description}>{transaction.description || 'Transaction'}</Text>

          {/* Details */}
          <View style={styles.detailsContainer}>
            {/* Timestamp */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {formatFullTimestamp(transaction.created_at)}
              </Text>
            </View>

            {/* Balance After */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Balance After</Text>
              <Text style={styles.detailValue}>{transaction.balance_after} points</Text>
            </View>

            {/* Transaction ID */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction ID</Text>
              <Text style={[styles.detailValue, styles.transactionId]} numberOfLines={1}>
                {transaction.id}
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  appContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  appIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  iconContainer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },
  badgeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  typeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 18,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 32,
  },
  detailsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  transactionId: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
});
