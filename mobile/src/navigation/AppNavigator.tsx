import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '@/hooks/useAuth';
import { AuthNavigator } from '@/navigation/AuthNavigator';
import { DrawerContent } from '@/navigation/DrawerContent';
import { ChatStack } from '@/navigation/stacks/ChatStack';
import { AppsStack } from '@/navigation/stacks/AppsStack';
import { WalletStack } from '@/navigation/stacks/WalletStack';
import { ProfileStack } from '@/navigation/stacks/ProfileStack';
import { SplashScreen } from '@/screens/SplashScreen';

import type { RootStackParamList, MainDrawerParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainDrawer = createDrawerNavigator<MainDrawerParamList>();

/**
 * Main app drawer for authenticated users
 * 4 drawer items: Conversations (default), Apps, Wallet, Profile
 * Settings and Referrals are nested under Profile, not in drawer
 */
function MainNavigator() {
  return (
    <MainDrawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      initialRouteName="Conversations"
      screenOptions={{
        headerShown: false,
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
      }}
    >
      <MainDrawer.Screen
        name="Conversations"
        component={ChatStack}
        options={{
          drawerLabel: 'Conversations',
          drawerIcon: ({ color, size }) => (
            <Feather name="message-square" size={size} color={color} />
          ),
        }}
      />
      <MainDrawer.Screen
        name="Apps"
        component={AppsStack}
        options={{
          drawerLabel: 'Apps',
          drawerIcon: ({ color, size }) => (
            <Feather name="grid" size={size} color={color} />
          ),
        }}
      />
      <MainDrawer.Screen
        name="Wallet"
        component={WalletStack}
        options={{
          drawerLabel: 'Wallet',
          drawerIcon: ({ color, size }) => (
            <Feather name="dollar-sign" size={size} color={color} />
          ),
        }}
      />
      <MainDrawer.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          drawerLabel: 'Profile',
          drawerIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </MainDrawer.Navigator>
  );
}

/**
 * Root navigator that switches between Auth and Main flows
 * Shows splash screen while checking authentication state
 */
export function AppNavigator() {
  const { loading, isAuthenticated } = useAuth();

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {loading ? (
        <RootStack.Screen name="Splash" component={SplashScreen} />
      ) : isAuthenticated ? (
        <RootStack.Screen name="Main" component={MainNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}
