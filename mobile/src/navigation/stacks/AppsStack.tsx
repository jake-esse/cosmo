import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { AppsMarketplaceScreen } from '@/screens/apps/AppsMarketplaceScreen';
import { AppDetailScreen } from '@/screens/apps/AppDetailScreen';
import type { AppsStackParamList } from '../types';

const Stack = createNativeStackNavigator<AppsStackParamList>();

/**
 * Apps Stack Navigator
 * Contains app marketplace list and app detail screens
 * Will be implemented in Sprint 10-12
 */
export function AppsStack() {
  const navigation = useNavigation();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AppsMarketplace"
        component={AppsMarketplaceScreen}
        options={{
          headerShown: true,
          title: 'Apps',
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
        name="AppDetail"
        component={AppDetailScreen}
        options={{
          headerShown: true,
          title: 'App Details',
          headerBackTitle: 'Apps',
        }}
      />
    </Stack.Navigator>
  );
}
