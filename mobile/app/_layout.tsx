/**
 * Root Layout for Expo Router
 *
 * This layout wraps all routes with necessary providers and setup.
 * Replaces the previous App.tsx structure with Expo Router's file-based routing.
 */

import '../polyfills';

import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/contexts/AuthContext';

// Create QueryClient instance for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

/**
 * Root Layout Component
 *
 * Provider hierarchy:
 * 1. QueryClientProvider - React Query cache (outermost)
 * 2. AuthProvider - Global auth state
 * 3. SafeAreaProvider - Safe area insets
 * 4. Slot - Renders matched route
 */
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <Slot />
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
