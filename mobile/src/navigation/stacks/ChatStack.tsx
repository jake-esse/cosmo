import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { ConversationsScreen } from '@/screens/chat/ConversationsScreen';
import { ChatScreen } from '@/screens/chat/ChatScreen';
import type { ChatStackParamList } from '../types';

const Stack = createNativeStackNavigator<ChatStackParamList>();

/**
 * Chat Stack Navigator
 * Contains conversations list and individual chat screens
 */
export function ChatStack() {
  const navigation = useNavigation();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Conversations"
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
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {/* TODO: New conversation in Sprint 5-6 */}}
              style={{ marginRight: 8 }}
            >
              <Feather name="plus" size={24} color="#6366F1" />
            </TouchableOpacity>
          ),
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
