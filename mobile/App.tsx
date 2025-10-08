import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/contexts/AuthContext';
import { AppNavigator } from '@/navigation/AppNavigator';
import { linking } from '@/navigation/linking';

/**
 * Root App Component
 * Sets up auth provider, navigation, safe area, and status bar
 *
 * Provider hierarchy:
 * 1. AuthProvider - Global auth state (outermost)
 * 2. SafeAreaProvider - Safe area insets
 * 3. NavigationContainer - Navigation state with deep linking
 * 4. AppNavigator - App screens
 */
export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <NavigationContainer linking={linking}>
          <AppNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
