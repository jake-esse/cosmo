import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function ConversationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Conversations</Text>
      <Text style={styles.subtext}>Your chat conversations will appear here</Text>
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
