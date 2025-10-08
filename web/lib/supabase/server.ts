import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@shared/types/supabase'
import { config } from '@ampel/shared/config'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    config.supabase.url,
    config.supabase.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component cookies are read-only
          }
        },
      },
    }
  )
}