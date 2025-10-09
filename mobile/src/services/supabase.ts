import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@ampel/shared/types/supabase';
import { config } from '@ampel/shared/config';
import { supabaseStorageAdapter } from './storage/supabase-adapter';

/**
 * Supabase Client with Split Storage Strategy
 *
 * Uses a custom storage adapter that splits session data:
 * - Refresh tokens → SecureStore (sensitive, small)
 * - Session data → AsyncStorage (large, less sensitive)
 *
 * This prevents exceeding SecureStore's 2048 byte limit while
 * keeping the most sensitive tokens (refresh_token) secure.
 *
 * Configuration is loaded from shared config (root .env.local)
 */
export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      storage: supabaseStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
