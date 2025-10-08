import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { SettingsScreen } from '@/screens/profile/SettingsScreen';
import { ReferralScreen } from '@/screens/profile/ReferralScreen';
import type { ProfileStackParamList } from '../types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

/**
 * Profile Stack Navigator
 * Contains profile hub, settings, and referrals screens
 * Profile is the hub that navigates to Settings and Referrals
 */
export function ProfileStack() {
  const navigation = useNavigation();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: true,
          title: 'Profile',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
              style={{ marginLeft: 8 }}
            >
              <Feather name="menu" size={24} color="#1F2937" />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          title: 'Settings',
          headerBackTitle: 'Profile',
        }}
      />
      <Stack.Screen
        name="Referrals"
        component={ReferralScreen}
        options={{
          headerShown: true,
          title: 'Referral Center',
          headerBackTitle: 'Profile',
        }}
      />
    </Stack.Navigator>
  );
}
