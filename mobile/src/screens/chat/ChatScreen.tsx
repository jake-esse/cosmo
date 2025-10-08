import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import type { ChatStackParamList } from '@/navigation/types';

type ChatScreenRouteProp = RouteProp<ChatStackParamList, 'Chat'>;

/**
 * Chat Screen (Detail)
 * Individual chat conversation interface
 * Will be implemented in Sprint 5-6
 */
export function ChatScreen() {
  const route = useRoute<ChatScreenRouteProp>();
  const { conversationId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>💬</Text>
      <Text style={styles.title}>Chat Conversation</Text>
      <Text style={styles.subtitle}>Conversation ID: {conversationId}</Text>
      <Text style={styles.comingSoon}>Coming in Sprint 5-6</Text>
      <Text style={styles.description}>
        Full AI chat interface with message history, streaming responses, and conversation management
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  comingSoon: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});
