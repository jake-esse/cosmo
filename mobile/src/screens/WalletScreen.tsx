import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function WalletScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Wallet Screen</Text>
      <Text style={styles.subtext}>Equity wallet and points will be displayed here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: '#666666',
  },
});
