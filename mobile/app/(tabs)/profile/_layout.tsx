/**
 * Profile Stack Layout
 *
 * Provides stack navigation for:
 * - Profile hub (index)
 * - Settings (settings)
 * - Referrals (referrals)
 */

import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Profile',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="referrals"
        options={{
          title: 'Referral Center',
        }}
      />
    </Stack>
  );
}
