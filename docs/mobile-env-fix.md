# Mobile Environment Variable Fix

## Issue

Mobile app (Expo/React Native) was failing with error:
```
Missing required environment variable: SUPABASE_URL
```

Even though the root `.env.local` file had the correct variables:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Root Causes

### 1. Platform Detection Issue

**Problem:** The shared config's platform detection relied on checking for `process.env.EXPO_PUBLIC_SUPABASE_URL` to determine if running in Expo:

```typescript
// ❌ BEFORE: Chicken-and-egg problem
const isExpo = typeof process !== 'undefined' &&
  process.env.EXPO_PUBLIC_SUPABASE_URL !== undefined;
```

This created a chicken-and-egg problem: If the env var wasn't loaded yet, it couldn't detect the platform, so it didn't know which prefix to use!

**Solution:** Changed to detect React Native environment using built-in globals:

```typescript
// ✅ AFTER: Reliable platform detection
const globalNav = (globalThis as any).navigator;
const isReactNative = globalNav !== undefined &&
  globalNav.product === 'ReactNative';
```

### 2. Environment Variable Loading

**Problem:** When running `npm run start --workspace=@ampel/mobile` from root, npm changes the working directory to `/mobile` before running `expo start`. This means Expo looks for `.env.local` in `/mobile`, not in the root where it actually exists.

**Solution:** Created `mobile/app.config.js` (replacing `mobile/app.json`) that explicitly loads environment variables from the root `.env.local` file:

```javascript
// Load environment variables from root .env.local
const rootEnvPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(rootEnvPath)) {
  const envContent = fs.readFileSync(rootEnvPath, 'utf-8');
  // Parse and set EXPO_PUBLIC_* variables
  // ...
}
```

## Files Changed

### 1. `/shared/config/env.ts`

**Before:**
```typescript
// Platform detection relied on env vars
const isExpo = typeof process !== 'undefined' &&
  process.env.EXPO_PUBLIC_SUPABASE_URL !== undefined;
```

**After:**
```typescript
// Platform detection uses React Native globals
const globalNav = (globalThis as any).navigator;
const isReactNative = globalNav !== undefined &&
  globalNav.product === 'ReactNative';
```

### 2. `/mobile/app.config.js` (NEW)

Created JavaScript config file that:
- Loads root `.env.local` file
- Parses and sets `EXPO_PUBLIC_*` environment variables
- Provides all existing app.json configuration
- Logs success/failure of env loading

### 3. `/mobile/test-config.js` (NEW)

Created test script to verify configuration:
- Checks root `.env.local` exists
- Verifies required variables are present
- Confirms `app.config.js` is properly configured

## How It Works Now

### 1. Environment Loading Flow

```
┌─────────────────────────────────────────┐
│ npm run start --workspace=@ampel/mobile │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Expo reads mobile/app.config.js        │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  app.config.js loads ../.env.local      │
│  Parses EXPO_PUBLIC_* variables         │
│  Sets in process.env                    │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Mobile app imports shared config       │
│  import { config } from '@ampel/shared' │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Config detects React Native platform  │
│  Looks for EXPO_PUBLIC_* variables      │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  ✅ config.supabase.url available       │
│  ✅ config.supabase.anonKey available   │
└─────────────────────────────────────────┘
```

### 2. Platform Detection

The shared config now reliably detects platforms:

```typescript
// In React Native/Expo:
config.platform.isMobile === true
config.platform.isWeb === false

// In Next.js:
config.platform.isWeb === true
config.platform.isMobile === false
```

### 3. Variable Access

Mobile code can now access config:

```typescript
import { config } from '@ampel/shared/config';
import { createClient } from '@supabase/supabase-js';

// ✅ Works correctly
const supabase = createClient(
  config.supabase.url,      // Loaded from EXPO_PUBLIC_SUPABASE_URL
  config.supabase.anonKey   // Loaded from EXPO_PUBLIC_SUPABASE_ANON_KEY
);
```

## Verification Steps

### 1. Run Configuration Test

```bash
cd mobile
node test-config.js
```

Expected output:
```
✅ ALL CHECKS PASSED - Configuration is ready!
```

### 2. Type Check All Workspaces

```bash
npm run typecheck
```

All workspaces should pass with no errors.

### 3. Start Mobile Development Server

```bash
npm run start --workspace=@ampel/mobile
```

Look for log message:
```
✅ Loaded environment variables from root .env.local
```

## Key Benefits

### 1. No More Chicken-and-Egg Problem
- Platform detection doesn't rely on env vars
- Uses React Native's built-in `navigator.product`
- More reliable and deterministic

### 2. Explicit Env Loading
- `app.config.js` explicitly loads root `.env.local`
- Clear success/failure logging
- No silent failures

### 3. Single Source of Truth
- Only root `.env.local` exists
- No mobile/.env duplication
- Consistent with web environment

### 4. Type Safety Maintained
- All TypeScript checks pass
- No `any` types exposed to application code
- Full autocomplete support

## Troubleshooting

### If mobile app still can't find variables:

1. **Verify root .env.local exists:**
   ```bash
   ls -la .env.local
   ```

2. **Check EXPO_PUBLIC_ variables are present:**
   ```bash
   grep EXPO_PUBLIC .env.local
   ```

3. **Run the test script:**
   ```bash
   cd mobile && node test-config.js
   ```

4. **Clear Metro bundler cache:**
   ```bash
   cd mobile && npx expo start --clear
   ```

5. **Check app.config.js logs:**
   Look for "✅ Loaded environment variables" message when starting

### If platform detection fails:

The config will log platform detection results in development:
```
🔧 Configuration loaded:
   Platform: Mobile (Expo)
   Server: false
   Supabase URL: ✓
   Supabase Anon Key: ✓
```

If it shows "Platform: Unknown", the React Native detection failed.

## Related Files

- `/shared/config/env.ts` - Platform detection and env loading
- `/shared/config/index.ts` - Main config export
- `/shared/config/validation.ts` - Runtime validation
- `/mobile/app.config.js` - Expo config with env loading
- `/mobile/src/services/supabase.ts` - Supabase client using config
- `/mobile/test-config.js` - Configuration test script

## Testing Checklist

- ✅ TypeScript type checks pass (all workspaces)
- ✅ Root .env.local has EXPO_PUBLIC_* variables
- ✅ app.config.js exists and loads root .env.local
- ✅ Platform detection identifies React Native correctly
- ✅ Config loads without errors
- ✅ Supabase client can access config.supabase.url and .anonKey
- ✅ No references to plain SUPABASE_URL (without prefix)
- ✅ mobile/.env deleted and .gitignore'd

## Summary

The mobile environment variable issue has been fully resolved by:

1. **Fixing platform detection** to use React Native globals instead of env vars
2. **Creating app.config.js** to explicitly load root .env.local
3. **Adding test script** to verify configuration
4. **Maintaining type safety** across all workspaces

The mobile app now successfully loads environment variables from the root `.env.local` file and properly detects that it's running in React Native, allowing the shared config system to work correctly.
