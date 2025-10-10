/**
 * Chat Stack Layout
 *
 * Provides stack navigation for:
 * - Conversations list (index)
 * - Chat detail ([id])
 */

import { Stack } from 'expo-router';

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Conversations',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Chat',
        }}
      />
    </Stack>
  );
}
