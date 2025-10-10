/**
 * Auth Layout - Stack Navigator for Authentication Screens
 *
 * Provides a stack navigator for login, signup, and password reset flows.
 * This is a route group wrapped in parentheses to keep it out of URL paths.
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: 'Log In',
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          title: 'Sign Up',
        }}
      />
    </Stack>
  );
}
