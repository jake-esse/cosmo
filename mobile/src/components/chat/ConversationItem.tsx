import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';

interface ConversationItemProps {
  id: string;
  title: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount?: number;
  archived?: boolean;
  onPress: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
}

/**
 * Conversation list item component
 * Displays conversation info with swipe-to-archive and swipe-to-delete gestures
 * Shows avatar, title, preview, timestamp, and unread badge
 */
export function ConversationItem({
  id,
  title,
  lastMessage,
  lastMessageAt,
  unreadCount = 0,
  archived = false,
  onPress,
  onDelete,
  onArchive,
}: ConversationItemProps) {
  const renderRightActions = () => {
    if (!onDelete && !onArchive) return null;

    return (
      <View style={styles.actionsContainer}>
        {onArchive && (
          <TouchableOpacity
            style={styles.archiveButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onArchive();
            }}
          >
            <Feather name={archived ? 'folder' : 'archive'} size={20} color="#FFFFFF" />
            <Text style={styles.archiveButtonText}>
              {archived ? 'Unarchive' : 'Archive'}
            </Text>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onDelete();
            }}
          >
            <Feather name="trash-2" size={20} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const handleSwipeableOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formattedTime = lastMessageAt
    ? formatDistanceToNow(lastMessageAt, { addSuffix: true })
    : '';

  const truncatedMessage = lastMessage
    ? lastMessage.length > 50
      ? `${lastMessage.substring(0, 50)}...`
      : lastMessage
    : 'No messages yet';

  const avatarLetter = title.charAt(0).toUpperCase();

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      onSwipeableOpen={handleSwipeableOpen}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {lastMessageAt && (
              <Text style={styles.timestamp}>{formattedTime}</Text>
            )}
          </View>

          <Text style={styles.lastMessage} numberOfLines={1}>
            {truncatedMessage}
          </Text>
        </View>

        <View style={styles.rightSection}>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
          <Feather name="chevron-right" size={20} color="#9CA3AF" />
        </View>
      </TouchableOpacity>

      <View style={styles.divider} />
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 76, // Align with content (avatar width + margin)
  },
  actionsContainer: {
    flexDirection: 'row',
  },
  archiveButton: {
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  archiveButtonText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteButtonText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
