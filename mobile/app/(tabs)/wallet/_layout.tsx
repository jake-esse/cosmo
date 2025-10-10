/**
 * Wallet Stack Layout
 *
 * Provides stack navigation for:
 * - Wallet overview (index)
 * - Transaction history (history)
 */

import { Stack } from 'expo-router';

export default function WalletLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Wallet',
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: 'Transaction History',
        }}
      />
    </Stack>
  );
}
