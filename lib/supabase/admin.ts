import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

let adminClient: ReturnType<typeof createClient<Database>> | null = null

export function createAdminClient() {
  if (adminClient) return adminClient

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
  }

  adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  return adminClient
}