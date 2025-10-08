import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@ampel/shared/types/supabase';
import { config } from '@ampel/shared/config';
import { secureStorage, SECURE_STORAGE_KEYS } from './storage/secure';

/**
 * Secure Storage Adapter for Supabase
 * Implements Supabase's storage interface using expo-secure-store
 * This ensures auth tokens are stored securely
 */
const secureStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return await secureStorage.getItem(SECURE_STORAGE_KEYS.AUTH_SESSION);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await secureStorage.setItem(SECURE_STORAGE_KEYS.AUTH_SESSION, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await secureStorage.removeItem(SECURE_STORAGE_KEYS.AUTH_SESSION);
  },
};

// Create Supabase client with secure storage for session persistence
// Configuration is loaded from shared config (root .env.local)
export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      storage: secureStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
