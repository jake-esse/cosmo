# Supabase Client Usage Guide

## Overview
This directory contains three Supabase client configurations for different contexts in the Cosmo platform.

## Client Types

### 1. Browser Client (`client.ts`)
- **Use Case**: Client-side components that run in the browser
- **Authentication**: Uses cookies automatically
- **Pattern**: Singleton to avoid multiple instances
- **Usage**:
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data } = await supabase.from('profiles').select()
```

### 2. Server Client (`server.ts`)
- **Use Case**: Server Components, Route Handlers, Server Actions
- **Authentication**: Handles Next.js cookies for auth persistence
- **Pattern**: Creates new instance per request
- **Usage**:
```typescript
import { createClient } from '@/lib/supabase/server'

export async function MyServerComponent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
}
```

### 3. Admin Client (`admin.ts`)
- **Use Case**: Backend operations requiring elevated privileges
- **Authentication**: Uses service role key (bypasses RLS)
- **Pattern**: Singleton with no session persistence
- **Security**: NEVER expose to client-side code
- **Usage**:
```typescript
import { createAdminClient } from '@/lib/supabase/admin'

const supabase = createAdminClient()
// Can perform admin operations like creating users
const { data } = await supabase.auth.admin.createUser({
  email: 'user@example.com',
  password: 'password123'
})
```

## Important Notes

### Security
- Admin client uses service role key - keep server-side only
- Browser client uses anon key - safe for client exposure
- Server client manages auth cookies securely

### Type Safety
- All clients use the `Database` type from `/types/supabase.ts`
- Update types when database schema changes:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

### Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Common Patterns

### Check Authentication Status
```typescript
// Server Component
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

// Client Component with hook
import { useAuth } from '@/hooks/useAuth'
const { user, loading } = useAuth()
```

### Handle Realtime Subscriptions (Client Only)
```typescript
const supabase = createClient()
const channel = supabase
  .channel('realtime-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'profiles' },
    (payload) => console.log(payload)
  )
  .subscribe()
```

### Error Handling
```typescript
const { data, error } = await supabase.from('profiles').select()
if (error) {
  console.error('Supabase error:', error.message)
  // Handle error appropriately
}
```

## Troubleshooting

### Common Issues
1. **Auth not persisting**: Ensure middleware.ts is properly configured
2. **Type errors**: Regenerate types after schema changes
3. **Permission denied**: Check RLS policies or use admin client
4. **Cookie issues**: Server components are read-only for cookies