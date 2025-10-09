import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ConversationItem } from '@/components/chat/ConversationItem';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import {
  useConversations,
  useDeleteConversation,
  useArchiveConversation,
  confirmDeleteConversation,
} from '@/hooks/useConversations';
import type { ChatStackParamList } from '@/navigation/types';

type NavigationProp = NativeStackNavigationProp<ChatStackParamList, 'ConversationsList'>;

/**
 * ConversationsScreen - Displays list of all user conversations
 *
 * Features:
 * - List all conversations with preview
 * - Search/filter conversations
 * - Swipe to archive/delete
 * - Pull to refresh
 * - Create new conversation via header button
 * - Navigate to chat on tap
 */
export function ConversationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Fetch conversations with React Query
  const {
    data: conversations = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useConversations(user?.id, showArchived);

  // Mutations
  const deleteMutation = useDeleteConversation();
  const archiveMutation = useArchiveConversation();

  /**
   * Filter conversations based on search query
   */
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }

    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.title?.toLowerCase().includes(query) ||
        // We don't have last_message in the Conversation type, so we'll just search by title
        // In the future, we could enhance this by fetching the last message
        false
    );
  }, [conversations, searchQuery]);

  /**
   * Handle navigation to chat screen
   */
  const handleConversationPress = (conversationId: string) => {
    navigation.navigate('Chat', { conversationId });
  };

  /**
   * Handle delete conversation
   */
  const handleDelete = (conversationId: string) => {
    confirmDeleteConversation(conversationId, deleteMutation);
  };

  /**
   * Handle archive/unarchive conversation
   */
  const handleArchive = (conversationId: string, currentArchived: boolean) => {
    archiveMutation.mutate({
      conversationId,
      archived: !currentArchived,
    });
  };

  /**
   * Render a single conversation item
   */
  const renderConversation = ({ item }: { item: (typeof conversations)[0] }) => {
    const lastMessageDate = item.last_message_at
      ? new Date(item.last_message_at)
      : undefined;

    return (
      <ConversationItem
        id={item.id}
        title={item.title || 'New Conversation'}
        lastMessage={undefined} // We don't have this in the current schema
        lastMessageAt={lastMessageDate}
        archived={item.archived}
        onPress={() => handleConversationPress(item.id)}
        onDelete={() => handleDelete(item.id)}
        onArchive={() => handleArchive(item.id, item.archived)}
      />
    );
  };

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="alert-circle"
          title="Failed to load conversations"
          message="There was an error loading your conversations. Please try again."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  /**
   * Render empty state
   */
  if (filteredConversations.length === 0 && !searchQuery) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="message-circle"
          title="No conversations yet"
          message="Start your first conversation by tapping the + button above"
        />
      </SafeAreaView>
    );
  }

  /**
   * Render search no results
   */
  if (filteredConversations.length === 0 && searchQuery) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Feather name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <EmptyState
          icon="search"
          title="No conversations found"
          message={`No conversations match "${searchQuery}"`}
        />
      </SafeAreaView>
    );
  }

  /**
   * Main render
   */
  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#6366F1"
          />
        }
        ListHeaderComponent={
          searchQuery ? (
            <View style={styles.resultCount}>
              <Text style={styles.resultCountText}>
                {filteredConversations.length} result
                {filteredConversations.length !== 1 ? 's' : ''}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  listContent: {
    flexGrow: 1,
  },
  resultCount: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  resultCountText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
