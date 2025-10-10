/**
 * Main App Entry Point
 *
 * This index route handles authentication-based routing.
 * It redirects users to either the auth flow or the main app
 * based on their authentication status.
 *
 * Uses useSegments() to prevent redirect loops by checking
 * which route group the user is currently in.
 */

import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { useAuth } from '@/hooks/useAuth';

/**
 * Index Route Component
 *
 * Handles auth-based redirects:
 * - Unauthenticated users → /(auth)/login
 * - Authenticated users → /(tabs)/chat
 *
 * The providers (Auth, Query, SafeArea) are already set up in _layout.tsx
 */
export default function Index() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while still loading auth state
    if (loading) return;

    // Get the current route group (first segment in parentheses)
    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (user && !inTabsGroup) {
      // User is authenticated but not in tabs → redirect to chat
      router.replace('/(tabs)/chat');
    } else if (!user && !inAuthGroup) {
      // User is not authenticated and not in auth → redirect to login
      router.replace('/(auth)/login');
    }
  }, [user, loading, segments, router]);

  // Show loading spinner while checking auth state
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366F1" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
