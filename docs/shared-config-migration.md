# Shared Configuration System Migration

## Summary

Successfully migrated the Ampel monorepo to use a centralized configuration system that eliminates environment variable duplication between web and mobile workspaces.

**Completed:** October 8, 2025

## What Changed

### ✅ Created Shared Config Package

**Location:** `/shared/config/`

**Files Created:**
- `types.ts` - TypeScript interfaces for all configuration
- `env.ts` - Environment loader with cross-platform detection
- `validation.ts` - Runtime validation with clear error messages
- `index.ts` - Main config export (singleton pattern)

**Features:**
- Type-safe access to environment variables
- Automatic platform detection (Next.js vs Expo)
- Runtime validation of required variables
- Clear error messages when variables are missing
- Works seamlessly in both web and mobile environments

### ✅ Updated Package Configuration

**File:** `shared/package.json`

Added exports field to support:
```json
{
  "exports": {
    "./config": "./config/index.ts",
    "./types": "./types/index.ts",
    "./utils": "./utils/index.ts",
    "./constants": "./constants/index.ts"
  }
}
```

### ✅ Migrated Web Application

**Files Updated:**
- `web/lib/supabase/client.ts` - Browser Supabase client
- `web/lib/supabase/server.ts` - Server Supabase client
- `web/lib/supabase/admin.ts` - Admin Supabase client
- `web/middleware.ts` - Authentication middleware

**Before:**
```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**After:**
```typescript
import { config } from '@ampel/shared/config';

const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);
```

### ✅ Migrated Mobile Application

**Files Updated:**
- `mobile/src/services/supabase.ts` - Mobile Supabase client

**Before:**
```typescript
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
```

**After:**
```typescript
import { config } from '@ampel/shared/config';

export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey,
  // ... options
);
```

### ✅ Cleaned Up Environment Files

**Deleted:**
- `mobile/.env` (duplication eliminated)

**Updated:**
- `.gitignore` - Added explicit rule to prevent `mobile/.env` recreation

**Single Source of Truth:**
- Root `.env.local` is now the ONLY environment file
- Contains both `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` prefixes
- Both web and mobile read from the same file

### ✅ Updated Documentation

**Files Updated:**
- `README.md` - Added configuration system section
- `mobile/README.md` - Updated environment variable instructions

**Key Documentation Changes:**
- Emphasized single source of truth (root `.env.local`)
- Added shared config usage examples
- Documented platform detection features
- Added troubleshooting section for env vars

## Configuration API

### Basic Usage

```typescript
import { config } from '@ampel/shared/config';

// Supabase (required for both platforms)
config.supabase.url        // string
config.supabase.anonKey    // string
config.supabase.serviceRoleKey  // string | undefined (server-only)

// AI Providers (optional, server-only)
config.api.anthropic   // string | undefined
config.api.openai      // string | undefined
config.api.xai         // string | undefined
config.api.googleAi    // string | undefined

// Application
config.app.url   // string
config.app.name  // string

// Platform Detection
config.platform.isWeb      // boolean
config.platform.isMobile   // boolean
config.platform.isServer   // boolean

// Identity Verification (optional, server-only)
config.persona.apiKey         // string | undefined
config.persona.templateId     // string | undefined
config.persona.webhookSecret  // string | undefined

// Email (optional, server-only)
config.email.resendApiKey  // string | undefined

// Analytics (optional)
config.analytics.gaMeasurementId  // string | undefined
config.analytics.sentryDsn        // string | undefined
```

### Platform Detection

The config system automatically detects the environment:

```typescript
if (config.platform.isWeb) {
  // Next.js web-specific code
}

if (config.platform.isMobile) {
  // Expo mobile-specific code
}

if (config.platform.isServer) {
  // Server-side code (API keys available)
}
```

### Error Handling

The config validates required variables on load and throws clear errors:

```
ConfigValidationError: Configuration validation failed for Expo (mobile):
  - Supabase URL is required

Please check your root .env.local file and ensure all required variables are set.
```

## Environment Variables

### Required Variables

Both platforms require these in root `.env.local`:

```env
# Web
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Mobile
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Server-only
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Optional Variables

```env
# AI Provider Keys (server-only)
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
GOOGLE_AI_API_KEY=your_key
XAI_API_KEY=your_key

# Identity Verification (server-only)
PERSONA_API_KEY=your_key
PERSONA_TEMPLATE_ID=your_template_id
PERSONA_WEBHOOK_SECRET=your_secret

# Email (server-only)
RESEND_VERIFICATION_API_KEY=your_key

# Analytics (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=your_id
SENTRY_DSN=your_dsn

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Benefits

### 1. DRY Principle
- ✅ Single source of truth for environment variables
- ✅ No duplication between `mobile/.env` and root `.env.local`
- ✅ Easier to maintain and update configuration

### 2. Type Safety
- ✅ Full TypeScript support with interfaces
- ✅ Compile-time checking for config access
- ✅ IDE autocomplete for all config properties

### 3. Runtime Validation
- ✅ Clear error messages for missing required variables
- ✅ Validates at startup before app runs
- ✅ Prevents runtime errors from missing config

### 4. Platform Agnostic
- ✅ Works in Next.js (web)
- ✅ Works in Expo (mobile)
- ✅ Automatically detects and adapts to platform

### 5. Developer Experience
- ✅ Import once: `import { config } from '@ampel/shared/config'`
- ✅ Access anywhere: `config.supabase.url`
- ✅ No more `process.env.NEXT_PUBLIC_*` or `process.env.EXPO_PUBLIC_*`

## Testing Results

### TypeScript Type Checks

All workspaces pass TypeScript type checking:

```bash
✅ npm run typecheck --workspace=@ampel/shared
✅ npm run typecheck --workspace=@ampel/mobile
✅ npm run typecheck --workspace=@ampel/web (existing errors unrelated to config)
```

### Configuration Loading

- ✅ Config loads successfully in web environment
- ✅ Config loads successfully in mobile environment
- ✅ Platform detection works correctly
- ✅ Validation errors are clear and helpful

## Migration Checklist

- ✅ Create shared/config infrastructure
- ✅ Update shared/package.json exports
- ✅ Migrate web Supabase clients
- ✅ Migrate web middleware
- ✅ Migrate mobile Supabase client
- ✅ Delete mobile/.env file
- ✅ Update .gitignore
- ✅ Test web type checking
- ✅ Test mobile type checking
- ✅ Update documentation (README, mobile/README)
- ✅ Verify config files exist
- ✅ Verify mobile/.env is deleted
- ✅ No config-related TypeScript errors

## Future Enhancements

Potential improvements for future consideration:

1. **Environment-Specific Configs**
   - Development vs production configurations
   - Staging environment support

2. **Config Validation Schema**
   - Use Zod for schema validation
   - Custom validation rules

3. **Hot Reload**
   - Reload config without restart (dev only)
   - Watch .env.local for changes

4. **Config Documentation**
   - Auto-generate config docs from types
   - Config variable reference guide

5. **Secret Management**
   - Integration with secret management tools
   - Encrypted environment variables

## Support

For questions or issues with the config system:

1. Check this document
2. Review `/shared/config/types.ts` for available config options
3. Check console for clear error messages
4. Ensure root `.env.local` has all required variables

## References

- Source: `/shared/config/`
- Documentation: `README.md`, `mobile/README.md`
- Example Usage: `web/lib/supabase/*.ts`, `mobile/src/services/supabase.ts`
