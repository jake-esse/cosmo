import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Reusable loading state component
 * Shows a centered spinner with optional message
 */
export function LoadingState({ message, size = 'medium' }: LoadingStateProps) {
  const spinnerSize = size === 'small' ? 'small' : 'large';

  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size={spinnerSize} color="#9CA3AF" />
      {message && <Text style={styles.message}>{message}</Text>}
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
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
