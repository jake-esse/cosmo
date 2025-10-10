/**
 * Apps Stack Layout
 *
 * Provides stack navigation for:
 * - Apps marketplace (index)
 * - App detail ([id])
 */

import { Stack } from 'expo-router';

export default function AppsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Apps',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'App Detail',
        }}
      />
    </Stack>
  );
}
