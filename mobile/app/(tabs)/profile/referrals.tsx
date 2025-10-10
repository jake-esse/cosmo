import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BRAND } from '@ampel/shared/constants/brand';

/**
 * Referral Center Screen
 * Share referral code and track referral rewards
 * Will be implemented in Sprint 15
 */
export default function ReferralScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🎁</Text>
        <Text style={styles.title}>Referral Center</Text>
        <Text style={styles.subtitle}>Share Ampel and earn equity together</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Referral Rewards</Text>
          <Text style={styles.infoText}>• You earn 50 equity points for each friend who signs up</Text>
          <Text style={styles.infoText}>• Your friend gets 25 bonus points on top of their signup reward</Text>
          <Text style={styles.infoText}>• Everyone wins with shared ownership!</Text>
        </View>

        <Text style={styles.comingSoon}>Coming in Sprint 15</Text>
        <Text style={styles.description}>
          Share your unique referral code, track referrals, view earnings, and see your impact
        </Text>
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
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
    marginTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: BRAND.colors.primary,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 8,
  },
  comingSoon: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});
