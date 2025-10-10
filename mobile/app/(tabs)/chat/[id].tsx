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
import { useLocalSearchParams } from 'expo-router';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { EmptyState } from '@/components/common/EmptyState';
import { generateAPIUrl } from '@/utils/api';
import { supabase } from '@/services/supabase';
import {
  getMessages,
  getConversation,
  updateConversationTitle,
  generateTitle,
  type Message,
} from '@/services/api/chat';
import { getErrorMessage, getDefaultModelId } from '@/services/api/ai';

/**
 * ChatScreen - AI chat interface using Vercel AI SDK
 *
 * Features:
 * - Real-time AI response streaming via useChat hook
 * - Persistent message storage in Supabase
 * - Auto-scroll to bottom on new messages
 * - Pull-to-refresh to reload messages
 * - Equity point rewards for messages
 * - Auto-title generation from first message
 * - Proper keyboard handling
 */
export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();

  // State for Supabase messages
  const [loadedMessages, setLoadedMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modelId] = useState(getDefaultModelId());

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const isFirstLoad = useRef(true);
  const hasGeneratedTitle = useRef(false);
  const isSavingMessages = useRef(false);

  /**
   * useChat hook from AI SDK
   * Handles streaming, optimistic updates, and message state
   */
  const {
    messages: aiMessages,
    sendMessage,
    status,
    error: aiError,
    setMessages: setAiMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: generateAPIUrl('/api/chat'),
      fetch: globalThis.fetch,
    }),
    onFinish: async (options) => {
      const { message, messages: allMessages } = options;
      console.log('[ChatScreen] Message finished:', message);

      // Prevent duplicate saves
      if (isSavingMessages.current) {
        console.log('[ChatScreen] Already saving, skipping');
        return;
      }

      isSavingMessages.current = true;

      try {
        // Find the latest user message
        const userMessages = allMessages.filter(m => m.role === 'user');
        const latestUserMessage = userMessages[userMessages.length - 1];

        if (!latestUserMessage) {
          console.warn('[ChatScreen] No user message found');
          return;
        }

        // Extract text from message parts
        const getUserContent = (msg: UIMessage) => {
          const textParts = msg.parts.filter(p => 'text' in p);
          return textParts.map(p => ('text' in p ? p.text : '')).join('');
        };

        const userContent = getUserContent(latestUserMessage);
        const assistantContent = getUserContent(message);

        // Save user message to Supabase
        const { data: savedUserMessage, error: userError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            role: 'user',
            content: userContent,
            model: modelId,
          } as any)
          .select()
          .single();

        if (userError) {
          console.error('[ChatScreen] Error saving user message:', userError);
        } else {
          console.log('[ChatScreen] User message saved:', savedUserMessage);
        }

        // Save assistant message to Supabase
        const { data: savedAssistantMessage, error: assistantError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: assistantContent,
            model: modelId,
            tokens_used: 0, // Token counting not available in this flow
          } as any)
          .select()
          .single();

        if (assistantError) {
          console.error('[ChatScreen] Error saving assistant message:', assistantError);
        } else {
          console.log('[ChatScreen] Assistant message saved:', savedAssistantMessage);
        }

        // Update conversation metadata
        await supabase
          .from('conversations')
          // @ts-ignore - Supabase type inference issue
          .update({
            last_message_at: new Date().toISOString(),
          })
          .eq('id', conversationId);

        // Auto-generate title from first user message if needed
        if (!hasGeneratedTitle.current) {
          try {
            const conversation = await getConversation(conversationId!);
            if (
              conversation &&
              (conversation.title === 'New Conversation' || !conversation.title)
            ) {
              const newTitle = generateTitle(userContent);
              await updateConversationTitle(conversationId!, newTitle);
              hasGeneratedTitle.current = true;
              console.log('[ChatScreen] Auto-generated title:', newTitle);
            }
          } catch (titleError) {
            console.error('[ChatScreen] Error generating title:', titleError);
            // Non-critical error, continue
          }
        }

        // Award equity point for chat message
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const requestId = `chat-${conversationId}-${Date.now()}-${Math.random()}`;
            await supabase.rpc('award_equity_points', {
              p_user_id: user.id,
              p_action_type: 'app_usage',
              p_amount: 1,
              p_request_id: requestId,
              p_description: 'Chat message sent',
              p_app_id: null,
            } as any);
            console.log('[ChatScreen] Equity point awarded');
          }
        } catch (equityError) {
          console.error('[ChatScreen] Failed to award equity:', equityError);
          // Don't block chat on equity error
        }

        // Reload messages from Supabase to sync
        await loadMessages();
      } catch (error) {
        console.error('[ChatScreen] Error in onFinish:', error);
      } finally {
        isSavingMessages.current = false;
      }
    },
    onError: (error: Error) => {
      console.error('[ChatScreen] Chat error:', error);
      setError(getErrorMessage(error));
    },
  });

  // Compute isLoading from status
  const isLoading = status === 'submitted' || status === 'streaming';

  /**
   * Load messages on mount and when conversationId changes
   */
  useEffect(() => {
    if (conversationId) {
      loadMessages();
    }
  }, [conversationId]);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    const totalMessages = loadedMessages.length + aiMessages.length;
    if (totalMessages > 0 && !isFirstLoad.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [loadedMessages.length, aiMessages.length]);

  /**
   * Handle AI SDK errors
   */
  useEffect(() => {
    if (aiError) {
      setError(getErrorMessage(aiError));
    }
  }, [aiError]);

  /**
   * Load messages from Supabase
   */
  const loadMessages = async () => {
    if (!conversationId) return;

    try {
      setError(null);
      const fetchedMessages = await getMessages(conversationId);
      setLoadedMessages(fetchedMessages);

      // Clear AI messages when loading from DB (they're now persisted)
      setAiMessages([]);

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
   * Send a message using AI SDK
   */
  const handleSendMessage = async (content: string) => {
    if (isLoading || !content.trim()) return;

    setError(null);

    // Use sendMessage from useChat with body parameter for modelId
    await sendMessage(
      { role: 'user', parts: [{ type: 'text', text: content.trim() }] },
      { body: { modelId } }
    );
  };

  /**
   * Handle message copy
   */
  const handleMessageCopy = useCallback(() => {
    console.log('[ChatScreen] Message copied to clipboard');
  }, []);

  /**
   * Convert AI SDK message format to our Message type for rendering
   */
  const convertAiMessage = (msg: UIMessage, index: number): Message => {
    // Extract text content from UIMessage parts
    const textParts = msg.parts.filter(p => 'text' in p);
    const content = textParts.map(p => ('text' in p ? p.text : '')).join('');

    return {
      id: msg.id || `ai-${index}`,
      conversation_id: conversationId!,
      role: msg.role,
      content,
      created_at: new Date().toISOString(),
    };
  };

  /**
   * Merge loaded messages with streaming AI messages
   */
  const allMessages = [
    ...loadedMessages,
    ...aiMessages.map(convertAiMessage),
  ];

  /**
   * Render a single message
   */
  const renderMessage = ({ item }: { item: Message }) => {
    // Skip system messages (they're not displayed)
    if (item.role === 'system') return null;

    return (
      <MessageBubble
        role={item.role as 'user' | 'assistant'}
        content={item.content}
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
  if (allMessages.length === 0 && !loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState
          icon="message-circle"
          title="Start a conversation"
          message="Send a message to begin chatting with AI"
        />
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
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
          data={allMessages}
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
              {isLoading && <TypingIndicator visible={true} />}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                  <Text
                    style={styles.retryText}
                    onPress={() => setError(null)}
                  >
                    Tap to dismiss
                  </Text>
                </View>
              )}
            </>
          }
        />

        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
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
