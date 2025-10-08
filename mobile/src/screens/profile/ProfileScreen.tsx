import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { BRAND } from '@ampel/shared/constants/brand';
import type { ProfileStackParamList } from '@/navigation/types';

type ProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

/**
 * Profile Screen (Hub)
 * Central hub for user profile with navigation to Settings and Referrals
 * Displays user info, stats, and navigation cards
 */
export function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
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
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* User Info Section */}
        <View style={styles.userSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>
            {user?.user_metadata?.display_name || 'User'}
          </Text>
          <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
        </View>

        {/* Quick Stats - Placeholder for now */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>100</Text>
            <Text style={styles.statLabel}>Equity Points</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Conversations</Text>
          </View>
        </View>

        {/* Navigation Cards */}
        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={styles.navCard}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={styles.navCardIcon}>
              <Feather name="settings" size={24} color={BRAND.colors.primary} />
            </View>
            <View style={styles.navCardContent}>
              <Text style={styles.navCardTitle}>Settings</Text>
              <Text style={styles.navCardDescription}>App preferences & security</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navCard}
            onPress={() => navigation.navigate('Referrals')}
          >
            <View style={styles.navCardIcon}>
              <Feather name="users" size={24} color={BRAND.colors.primary} />
            </View>
            <View style={styles.navCardContent}>
              <Text style={styles.navCardTitle}>Referral Center</Text>
              <Text style={styles.navCardDescription}>Share and earn equity</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={18} color="#DC2626" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
  },
  userSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BRAND.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  cardsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  navCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navCardContent: {
    flex: 1,
  },
  navCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  navCardDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
});
