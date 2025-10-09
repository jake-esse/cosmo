import React, { useState } from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  useNavigation,
  DrawerActions,
  CompositeNavigationProp,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { Feather } from '@expo/vector-icons';
import { ConversationsScreen } from '@/screens/chat/ConversationsScreen';
import { ChatScreen } from '@/screens/chat/ChatScreen';
import { useAuth } from '@/hooks/useAuth';
import { useCreateConversation } from '@/hooks/useConversations';
import type { ChatStackParamList, MainDrawerParamList } from '../types';

const Stack = createNativeStackNavigator<ChatStackParamList>();

type ChatNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<ChatStackParamList, 'ConversationsList'>,
  DrawerNavigationProp<MainDrawerParamList>
>;

/**
 * New Chat Button Component
 * Handles creating a new conversation and navigating to it
 */
function NewChatButton() {
  const navigation = useNavigation<ChatNavigationProp>();
  const { user } = useAuth();
  const createConversation = useCreateConversation();
  const [isCreating, setIsCreating] = useState(false);

  const handleNewChat = async () => {
    if (!user?.id || isCreating) return;

    setIsCreating(true);
    try {
      createConversation.mutate(
        { userId: user.id },
        {
          onSuccess: (conversation) => {
            setIsCreating(false);
            // Navigate to the new conversation
            navigation.navigate('Chat', { conversationId: conversation.id });
          },
          onError: () => {
            setIsCreating(false);
          },
        }
      );
    } catch (error) {
      console.error('[NewChatButton] Error creating conversation:', error);
      setIsCreating(false);
    }
  };

  if (isCreating) {
    return <ActivityIndicator size="small" color="#6366F1" style={{ marginRight: 16 }} />;
  }

  return (
    <TouchableOpacity onPress={handleNewChat} style={{ marginRight: 8 }}>
      <Feather name="plus" size={24} color="#6366F1" />
    </TouchableOpacity>
  );
}

/**
 * Chat Stack Navigator
 * Contains conversations list and individual chat screens
 */
export function ChatStack() {
  const navigation = useNavigation();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ConversationsList"
        component={ConversationsScreen}
        options={{
          headerShown: true,
          title: 'Conversations',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
              style={{ marginLeft: 8 }}
            >
              <Feather name="menu" size={24} color="#1F2937" />
            </TouchableOpacity>
          ),
          headerRight: () => <NewChatButton />,
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerShown: true,
          title: 'Chat',
          headerBackTitle: 'Conversations',
        }}
      />
    </Stack.Navigator>
  );
}
