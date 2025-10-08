import { createClient } from '@supabase/supabase-js'
import type { Database } from '@shared/types/supabase'
import { config } from '@ampel/shared/config'

let adminClient: ReturnType<typeof createClient<Database>> | null = null

export function createAdminClient() {
  if (adminClient) return adminClient

  if (!config.supabase.serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
  }

  adminClient = createClient<Database>(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  return adminClient
}