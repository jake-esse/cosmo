import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { BRAND } from '@ampel/shared/constants';

/**
 * Balance Card Props
 */
export interface BalanceCardProps {
  balance: number;
  earned: number;
  spent: number;
  animated?: boolean;
}

/**
 * Balance Card Component
 * Displays user's equity balance prominently with stats
 *
 * Features:
 * - Large balance display
 * - Earned/Spent breakdown
 * - Optional balance animation on change
 * - Card shadow and styling
 *
 * @param balance - Current balance
 * @param earned - Total earned
 * @param spent - Total spent
 * @param animated - Enable balance animation (default: true)
 */
export function BalanceCard({ balance, earned, spent, animated = true }: BalanceCardProps) {
  const animatedValue = useRef(new Animated.Value(balance)).current;
  const displayValue = useRef(balance);

  useEffect(() => {
    if (!animated) {
      displayValue.current = balance;
      return;
    }

    // Animate balance change
    Animated.timing(animatedValue, {
      toValue: balance,
      duration: 500,
      useNativeDriver: false, // Can't use native driver for number animation
    }).start();

    // Update display value as animation progresses
    const listenerId = animatedValue.addListener(({ value }) => {
      displayValue.current = Math.round(value);
    });

    return () => {
      animatedValue.removeListener(listenerId);
    };
  }, [balance, animated, animatedValue]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Your Equity</Text>

      {/* Balance */}
      <View style={styles.balanceContainer}>
        <Animated.Text style={styles.balance}>
          {animated
            ? animatedValue.interpolate({
                inputRange: [0, balance],
                outputRange: ['0', balance.toString()],
              })
            : balance}
        </Animated.Text>
        <Text style={styles.pointsLabel}>points</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {/* Earned */}
        <View style={styles.statColumn}>
          <Text style={styles.statLabel}>Earned</Text>
          <Text style={[styles.statValue, styles.earnedValue]}>+{earned}</Text>
        </View>

        {/* Spent */}
        <View style={styles.statColumn}>
          <Text style={styles.statLabel}>Spent</Text>
          <Text style={[styles.statValue, styles.spentValue]}>-{spent}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // Shadow for Android
    elevation: 4,
  },
  header: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  balance: {
    fontSize: 48,
    fontWeight: 'bold',
    color: BRAND.colors.primary,
    marginRight: 8,
  },
  pointsLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  earnedValue: {
    color: '#10B981', // Green
  },
  spentValue: {
    color: '#EF4444', // Red
  },
});
