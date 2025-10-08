import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@shared/types/supabase'
import { config } from '@ampel/shared/config'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) return client

  client = createBrowserClient<Database>(
    config.supabase.url,
    config.supabase.anonKey
  )

  return client
}