import React from 'react';
import { Text, StyleSheet, ViewStyle } from 'react-native';

interface ErrorTextProps {
  message: string;
  style?: ViewStyle;
}

export function ErrorText({ message, style }: ErrorTextProps) {
  if (!message) return null;

  return <Text style={[styles.errorText, style]}>{message}</Text>;
}

const styles = StyleSheet.create({
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
});
