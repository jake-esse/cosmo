import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Reusable empty state component
 * Shows centered content with optional icon, message, and action button
 */
export function EmptyState({
  icon = 'message-square',
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Feather name={icon} size={64} color="#D1D5DB" />
        <Text style={styles.title}>{title}</Text>
        {message && <Text style={styles.message}>{message}</Text>}
        {actionLabel && onAction && (
          <TouchableOpacity style={styles.actionButton} onPress={onAction}>
            <Text style={styles.actionButtonText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    maxWidth: 400,
  },
  title: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  actionButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#6366F1',
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
