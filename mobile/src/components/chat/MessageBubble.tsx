import React from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import Clipboard from '@react-native-clipboard/clipboard';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNow } from 'date-fns';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokensUsed?: number;
  onCopy?: () => void;
}

/**
 * Message bubble component for chat messages
 * Supports markdown rendering for assistant messages
 * Long press to copy message with haptic feedback
 */
export function MessageBubble({
  role,
  content,
  timestamp,
  tokensUsed,
  onCopy,
}: MessageBubbleProps) {
  const isUser = role === 'user';

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Copy Message',
      'Copy this message to clipboard?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy',
          onPress: () => {
            Clipboard.setString(content);
            onCopy?.();
          },
        },
      ]
    );
  };

  const formattedTime = formatDistanceToNow(timestamp, { addSuffix: true });

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <Pressable
        onLongPress={handleLongPress}
        style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}
      >
        {isUser ? (
          <Text style={styles.userText}>{content}</Text>
        ) : (
          <Markdown style={markdownStyles}>{content}</Markdown>
        )}
      </Pressable>

      <View style={[styles.metadata, isUser ? styles.userMetadata : styles.assistantMetadata]}>
        <Text style={styles.timestamp}>{formattedTime}</Text>
        {!isUser && tokensUsed !== undefined && (
          <Text style={styles.tokens}> • {tokensUsed} tokens</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
  },
  metadata: {
    flexDirection: 'row',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  userMetadata: {
    justifyContent: 'flex-end',
  },
  assistantMetadata: {
    justifyContent: 'flex-start',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  tokens: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

const markdownStyles = {
  body: {
    color: '#111827',
    fontSize: 16,
    lineHeight: 22,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  strong: {
    fontWeight: '600' as const,
  },
  em: {
    fontStyle: 'italic' as const,
  },
  code_inline: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  code_block: {
    backgroundColor: '#1F2937',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  fence: {
    backgroundColor: '#1F2937',
    padding: 12,
    borderRadius: 8,
    color: '#F9FAFB',
    fontFamily: 'monospace',
    fontSize: 14,
    marginVertical: 8,
  },
  link: {
    color: '#3B82F6',
    textDecorationLine: 'underline' as const,
  },
  list_item: {
    marginVertical: 4,
  },
  bullet_list: {
    marginVertical: 8,
  },
  ordered_list: {
    marginVertical: 8,
  },
};
