import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Async Storage Service
 * Wrapper around AsyncStorage for storing non-sensitive data like session metadata
 *
 * IMPORTANT: Use this ONLY for non-sensitive data
 * Use SecureStore for sensitive data (tokens, credentials)
 */

export const asyncStorage = {
  /**
   * Store a value in AsyncStorage
   * @param key - Storage key
   * @param value - Value to store
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`[AsyncStorage] Error setting item ${key}:`, error);
      throw new Error('Failed to store data');
    }
  },

  /**
   * Retrieve a value from AsyncStorage
   * @param key - Storage key
   * @returns The stored value or null if not found
   */
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`[AsyncStorage] Error getting item ${key}:`, error);
      return null;
    }
  },

  /**
   * Remove a value from AsyncStorage
   * @param key - Storage key
   */
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`[AsyncStorage] Error removing item ${key}:`, error);
      throw new Error('Failed to remove data');
    }
  },
};

/**
 * Storage keys for async data
 * Centralized to avoid typos and maintain consistency
 */
export const ASYNC_STORAGE_KEYS = {
  AUTH_SESSION: 'ampel_auth_session',
  USER_PREFERENCES: 'ampel_user_preferences',
  LAST_ACTIVE_DATE: 'ampel_last_active_date',
} as const;
