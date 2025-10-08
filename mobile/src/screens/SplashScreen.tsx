import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { BRAND } from '@ampel/shared/constants/brand';

/**
 * Splash Screen
 * Displayed while checking authentication state on app launch
 */
export function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>{BRAND.name}</Text>
      <Text style={styles.tagline}>{BRAND.tagline}</Text>
      <ActivityIndicator
        size="large"
        color="#FFFFFF"
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND.colors.primary,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 32,
  },
  spinner: {
    marginTop: 16,
  },
});
