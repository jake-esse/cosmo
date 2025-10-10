/**
 * Tabs Layout - Drawer Navigator for Main App Screens
 *
 * Provides a drawer navigator for authenticated users with:
 * - Chat (Conversations)
 * - Wallet (Equity balance)
 * - Profile (User settings)
 *
 * This is a route group wrapped in parentheses to keep it out of URL paths.
 */

import { Drawer } from 'expo-router/drawer';
import { Feather } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        drawerActiveTintColor: '#6366F1',
        drawerInactiveTintColor: '#6B7280',
        drawerActiveBackgroundColor: '#EEF2FF',
        drawerItemStyle: {
          borderRadius: 8,
          marginHorizontal: 8,
        },
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#6366F1',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Drawer.Screen
        name="chat"
        options={{
          title: 'Chat',
          drawerLabel: 'Chat',
          drawerIcon: ({ color, size }) => (
            <Feather name="message-square" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="apps"
        options={{
          title: 'Apps',
          drawerLabel: 'Apps',
          drawerIcon: ({ color, size }) => (
            <Feather name="grid" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          drawerLabel: 'Wallet',
          drawerIcon: ({ color, size }) => (
            <Feather name="dollar-sign" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          title: 'Profile',
          drawerLabel: 'Profile',
          drawerIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Drawer>
  );
}
