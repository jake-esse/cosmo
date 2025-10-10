import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { WalletScreen } from '@/screens/WalletScreen';
import { TransactionHistoryScreen } from '@/screens/TransactionHistoryScreen';
import type { WalletStackParamList } from '../types';

const Stack = createNativeStackNavigator<WalletStackParamList>();

/**
 * Wallet Stack Navigator
 * Contains wallet overview and transaction history screens
 */
export function WalletStack() {
  const navigation = useNavigation();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="WalletOverview"
        component={WalletScreen}
        options={{
          headerShown: true,
          title: 'Wallet',
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
        name="TransactionHistory"
        component={TransactionHistoryScreen}
        options={{
          headerShown: true,
          title: 'Transaction History',
        }}
      />
    </Stack.Navigator>
  );
}
