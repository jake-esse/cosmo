import { secureStorage } from './secure';
import { asyncStorage } from './async';

/**
 * Split Storage Adapter for Supabase
 *
 * PROBLEM: Supabase sessions can exceed SecureStore's 2048 byte limit
 * SOLUTION: Split storage strategy:
 *   - Sensitive tokens (refresh_token) → SecureStore (secure but size-limited)
 *   - Large session data → AsyncStorage (unlimited size, device-local)
 *
 * This adapter transparently splits and reconstructs Supabase session data
 * to work around SecureStore size limitations while keeping sensitive tokens secure.
 */

const STORAGE_KEYS = {
  REFRESH_TOKEN: 'ampel_refresh_token', // SecureStore (small, sensitive)
  SESSION_DATA: 'ampel_session_data',   // AsyncStorage (large, less sensitive)
} as const;

interface SessionData {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: any;
  [key: string]: any;
}

/**
 * Supabase Storage Adapter with split storage strategy
 */
export const supabaseStorageAdapter = {
  /**
   * Store session: Split between SecureStore and AsyncStorage
   * - refresh_token → SecureStore (most sensitive)
   * - Everything else → AsyncStorage
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      const session: SessionData = JSON.parse(value);

      // Extract refresh token for secure storage
      const { refresh_token, ...sessionWithoutRefreshToken } = session;

      // Store refresh token securely (small, sensitive)
      if (refresh_token) {
        await secureStorage.setItem(
          STORAGE_KEYS.REFRESH_TOKEN,
          refresh_token
        );
      }

      // Store rest of session in AsyncStorage (large, less sensitive)
      await asyncStorage.setItem(
        STORAGE_KEYS.SESSION_DATA,
        JSON.stringify(sessionWithoutRefreshToken)
      );
    } catch (error) {
      console.error('[SupabaseStorageAdapter] Error storing session:', error);
      throw error;
    }
  },

  /**
   * Retrieve session: Reconstruct from both storage locations
   */
  async getItem(key: string): Promise<string | null> {
    try {
      // Get refresh token from SecureStore
      const refreshToken = await secureStorage.getItem(
        STORAGE_KEYS.REFRESH_TOKEN
      );

      // Get rest of session from AsyncStorage
      const sessionDataStr = await asyncStorage.getItem(
        STORAGE_KEYS.SESSION_DATA
      );

      // If no session data, return null
      if (!sessionDataStr) {
        return null;
      }

      // Reconstruct full session
      const sessionData: SessionData = JSON.parse(sessionDataStr);

      // Add refresh token back in
      if (refreshToken) {
        sessionData.refresh_token = refreshToken;
      }

      return JSON.stringify(sessionData);
    } catch (error) {
      console.error('[SupabaseStorageAdapter] Error retrieving session:', error);
      return null;
    }
  },

  /**
   * Remove session: Clear from both storage locations
   */
  async removeItem(key: string): Promise<void> {
    try {
      // Remove from both storages
      await Promise.all([
        secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        asyncStorage.removeItem(STORAGE_KEYS.SESSION_DATA),
      ]);
    } catch (error) {
      console.error('[SupabaseStorageAdapter] Error removing session:', error);
      throw error;
    }
  },
};
