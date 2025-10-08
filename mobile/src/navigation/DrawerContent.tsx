import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { BRAND } from '@ampel/shared/constants/brand';

/**
 * Custom Drawer Content
 * Displays user info at top, drawer items in middle, and logout button at bottom
 */
export function DrawerContent(props: DrawerContentComponentProps) {
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      {/* User Info Section */}
      <View style={styles.userSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>
          {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
        </Text>
        <View style={styles.equityBadge}>
          <Feather name="star" size={12} color="#6366F1" />
          <Text style={styles.equityText}>100 points</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Drawer Items (Chat, Apps, Wallet, Profile) */}
      <View style={styles.drawerItems}>
        <DrawerItemList {...props} />
      </View>

      {/* Spacer to push logout to bottom */}
      <View style={styles.spacer} />

      {/* Logout Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userSection: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BRAND.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  equityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  equityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  drawerItems: {
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
});
