import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

/**
 * Transaction Type Icon Props
 */
export interface TransactionTypeIconProps {
  description: string;
  size?: number;
}

/**
 * Icon mapping based on transaction description keywords
 */
const iconMapping = {
  signup: { icon: 'user-plus' as const, color: '#3B82F6' }, // Blue
  daily: { icon: 'calendar' as const, color: '#10B981' }, // Green
  chat: { icon: 'message-square' as const, color: '#8B5CF6' }, // Purple
  referral: { icon: 'users' as const, color: '#F59E0B' }, // Orange
  default: { icon: 'award' as const, color: '#6B7280' }, // Gray
};

/**
 * Get icon type based on description
 */
function getIconType(description: string): keyof typeof iconMapping {
  const lowerDesc = description.toLowerCase();

  if (lowerDesc.includes('signup')) return 'signup';
  if (lowerDesc.includes('daily')) return 'daily';
  if (lowerDesc.includes('chat') || lowerDesc.includes('message')) return 'chat';
  if (lowerDesc.includes('referral')) return 'referral';

  return 'default';
}

/**
 * Transaction Type Icon Component
 * Displays an icon with colored background based on transaction description
 *
 * Features:
 * - Automatically maps description to appropriate icon
 * - Colored circle background
 * - Customizable size
 *
 * @param description - Transaction description to determine icon
 * @param size - Size of icon circle (default: 40)
 */
export function TransactionTypeIcon({ description, size = 40 }: TransactionTypeIconProps) {
  const iconType = getIconType(description);
  const { icon, color } = iconMapping[iconType];

  // Circle background is 20% opacity of icon color
  const backgroundColor = `${color}33`; // Add 33 for 20% opacity in hex
  const iconSize = size / 2;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
    >
      <Feather name={icon} size={iconSize} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
