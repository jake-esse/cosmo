import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import type { ChatStackParamList } from '@/navigation/types';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { EmptyState } from '@/components/common/EmptyState';
import {
  sendMessage,
  getMessages,
  getConversation,
  updateConversationTitle,
  generateTitle,
  type Message,
} from '@/services/api/chat';
import { getErrorMessage, isRetryableError } from '@/services/api/ai';

type ChatScreenRouteProp = RouteProp<ChatStackParamList, 'Chat'>;

/**
 * ChatScreen - Full-featured chat interface with AI streaming
 *
 * Features:
 * - Real-time AI response streaming (character by character)
 * - Optimistic UI updates (messages appear instantly)
 * - Auto-scroll to bottom on new messages
 * - Pull-to-refresh to reload messages
 * - Proper keyboard handling
 * - Error handling with retry capability
 * - Typing indicator during AI generation
 */
export function ChatScreen() {
  const route = useRoute<ChatScreenRouteProp>();
  const { conversationId } = route.params;

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const isFirstLoad = useRef(true);
  const hasGeneratedTitle = useRef(false);

  /**
   * Load messages on mount and when conversationId changes
   */
  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    if (messages.length > 0 && !isFirstLoad.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  /**
   * Load messages from database
   */
  const loadMessages = async () => {
    try {
      setError(null);
      const fetchedMessages = await getMessages(conversationId);
      setMessages(fetchedMessages);

      // Scroll to bottom on first load
      if (isFirstLoad.current && fetchedMessages.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
          isFirstLoad.current = false;
        }, 100);
      }
    } catch (err) {
      console.error('[ChatScreen] Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  }, [conversationId]);

  /**
   * Send a message and stream the AI response
   */
  const handleSendMessage = async (content: string) => {
    if (sending || !content.trim()) return;

    setError(null);
    setSending(true);

    try {
      // Optimistic update: Add user message immediately
      const optimisticUserMessage: Message = {
        id: `temp-user-${Date.now()}`,
        conversation_id: conversationId,
        role: 'user',
        content: content.trim(),
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticUserMessage]);

      // Add placeholder for assistant message
      const optimisticAssistantMessage: Message = {
        id: `temp-assistant-${Date.now()}`,
        conversation_id: conversationId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticAssistantMessage]);

      // Reset streaming text
      setStreamingText('');

      // Send message with streaming
      await sendMessage({
        conversationId,
        content: content.trim(),
        onChunk: (chunk) => {
          // Update streaming text as chunks arrive
          setStreamingText((prev) => prev + chunk);
        },
        onComplete: async () => {
          // Auto-generate title from first user message if needed
          if (!hasGeneratedTitle.current) {
            try {
              const conversation = await getConversation(conversationId);
              if (
                conversation &&
                (conversation.title === 'New Conversation' || !conversation.title)
              ) {
                const newTitle = generateTitle(content.trim());
                await updateConversationTitle(conversationId, newTitle);
                hasGeneratedTitle.current = true;
                console.log('[ChatScreen] Auto-generated title:', newTitle);
              }
            } catch (titleError) {
              console.error('[ChatScreen] Error generating title:', titleError);
              // Non-critical error, continue
            }
          }

          // Reload messages to get the real saved versions
          await loadMessages();
          setStreamingText('');
        },
        onError: (err) => {
          console.error('[ChatScreen] Streaming error:', err);
          const errorMessage = getErrorMessage(err);
          setError(errorMessage);

          // Remove optimistic messages on error
          setMessages((prev) =>
            prev.filter(
              (msg) =>
                !msg.id.startsWith('temp-user-') && !msg.id.startsWith('temp-assistant-')
            )
          );
        },
      });
    } catch (err) {
      console.error('[ChatScreen] Error sending message:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);

      // Remove optimistic messages on error
      setMessages((prev) =>
        prev.filter(
          (msg) => !msg.id.startsWith('temp-user-') && !msg.id.startsWith('temp-assistant-')
        )
      );
    } finally {
      setSending(false);
    }
  };

  /**
   * Retry sending message after error
   */
  const handleRetry = () => {
    setError(null);
    // User will need to type and send again
  };

  /**
   * Handle message copy
   */
  const handleMessageCopy = useCallback(() => {
    console.log('[ChatScreen] Message copied to clipboard');
  }, []);

  /**
   * Render a single message
   */
  const renderMessage = ({ item }: { item: Message }) => {
    // Skip system messages (they're not displayed)
    if (item.role === 'system') return null;

    // If this is the assistant message being streamed, show streaming text
    const isStreaming = item.id.startsWith('temp-assistant-') && streamingText;
    const content = isStreaming ? streamingText : item.content;

    return (
      <MessageBubble
        role={item.role as 'user' | 'assistant'}
        content={content}
        timestamp={new Date(item.created_at)}
        tokensUsed={item.tokens_used}
        onCopy={handleMessageCopy}
      />
    );
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Render empty state
   */
  if (messages.length === 0 && !loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState
          icon="message-circle"
          title="Start a conversation"
          message="Send a message to begin chatting with AI"
        />
        <ChatInput onSend={handleSendMessage} disabled={sending} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={21}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListFooterComponent={
            <>
              {sending && <TypingIndicator visible={true} />}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                  {isRetryableError({ message: error }) && (
                    <Text style={styles.retryText} onPress={handleRetry}>
                      Tap to dismiss
                    </Text>
                  )}
                </View>
              )}
            </>
          }
        />

        <ChatInput onSend={handleSendMessage} disabled={sending} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  messageList: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  errorContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  errorText: {
    fontSize: 14,
    color: '#991B1B',
    marginBottom: 4,
  },
  retryText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 4,
  },
});
