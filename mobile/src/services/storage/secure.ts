import * as SecureStore from 'expo-secure-store';

/**
 * Secure Storage Service
 * Wrapper around expo-secure-store for storing sensitive data like auth tokens
 *
 * IMPORTANT: Use this ONLY for sensitive data (tokens, credentials)
 * Use AsyncStorage for non-sensitive user preferences
 */

export const secureStorage = {
  /**
   * Store a value securely
   * @param key - Storage key
   * @param value - Value to store
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`[SecureStorage] Error setting item ${key}:`, error);
      throw new Error('Failed to store secure data');
    }
  },

  /**
   * Retrieve a value securely
   * @param key - Storage key
   * @returns The stored value or null if not found
   */
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`[SecureStorage] Error getting item ${key}:`, error);
      return null;
    }
  },

  /**
   * Remove a value from secure storage
   * @param key - Storage key
   */
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`[SecureStorage] Error removing item ${key}:`, error);
      throw new Error('Failed to remove secure data');
    }
  },
};

/**
 * Storage keys for secure data
 * Centralized to avoid typos and maintain consistency
 */
export const SECURE_STORAGE_KEYS = {
  AUTH_SESSION: 'ampel_auth_session',
  BIOMETRIC_EMAIL: 'ampel_biometric_email',
  BIOMETRIC_ENABLED: 'ampel_biometric_enabled',
} as const;
