# Capacitor Phase 1 Summary

## Completed Tasks ✅

### 1. Cleanup
- ✅ Deleted `/mobile` directory (937MB React Native/Expo artifacts)
- ✅ Deleted `/web` directory (empty build artifacts)
- ✅ Updated `.gitignore` for Capacitor directories (`ios/`, `android/`, `/out/`)

### 2. Next.js Configuration
- ✅ Updated `next.config.ts` with conditional static export
  - Static export enabled via `NEXT_PUBLIC_BUILD_TARGET=mobile`
  - Images unoptimized for mobile builds
- ✅ Created `lib/config.ts` for API_BASE_URL configuration
  - Production: `https://ampel.app`
  - Development: `http://localhost:3000`
- ✅ Updated `.env.example` with `NEXT_PUBLIC_API_BASE_URL`

### 3. CORS Middleware
- ✅ Updated `middleware.ts` with CORS headers for `/api/*` routes
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization`
  - Handles OPTIONS preflight requests

### 4. Capacitor Setup
- ✅ Installed Capacitor v7.4.3:
  - `@capacitor/core`
  - `@capacitor/cli`
  - `@capacitor/ios`
  - `@capacitor/android`
- ✅ Initialized Capacitor:
  - App ID: `com.ampel.ai`
  - App Name: `Ampel`
  - Web directory: `out`
- ✅ Created `capacitor.config.ts` with HTTPS schemes
- ✅ Added iOS platform (created `/ios` directory)
- ✅ Added Android platform (created `/android` directory)

### 5. Build Scripts
- ✅ Created `scripts/build-mobile.sh` to handle mobile builds
  - Temporarily moves server-side routes during build
  - Cleans build cache
  - Restores routes after build
- ✅ Added npm scripts:
  - `build:mobile`: Build static export for Capacitor
  - `cap:sync`: Build and sync to native platforms

### 6. Dynamic Routes Handling
- ✅ Split `/chat/[id]` into server + client components
  - `page.tsx`: Server component with `generateStaticParams()`
  - `page.client.tsx`: Client component with UI logic

## Known Limitations ⚠️

### Next.js Static Export + Dynamic Routes
**Issue**: Next.js `output: 'export'` has fundamental limitations with dynamic routes like `/chat/[id]`.

**Current Status**:
- Build fails at "Collecting page data" phase
- Error: `Page "/chat/[id]" is missing "generateStaticParams()"`
- Even with `generateStaticParams()` returning `[]`, Next.js requires static params for export

**Root Cause**:
Static export (`output: 'export'`) is designed for fully static sites. Dynamic routes require either:
1. Pre-rendering all possible parameter values (not feasible for user-generated content like chats)
2. Server-side rendering (not available in static export)
3. Client-side only routing (not supported by Next.js static export)

## Recommended Solutions 🔧

### Option 1: Next.js Standalone Build (Recommended)
Instead of static export, use Next.js standalone build with a lightweight server:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone', // Instead of 'export'
  // ... rest of config
};
```

**Pros**:
- Supports all Next.js features (dynamic routes, API routes, SSR)
- Better performance for dynamic content
- Native mobile experience

**Cons**:
- Requires running Node.js server in mobile app
- Slightly larger app size
- More battery usage

### Option 2: Hybrid Approach
- Static export for pages WITHOUT dynamic routes
- External API calls for dynamic content
- Use react-router or similar for client-side routing

**Pros**:
- Smaller app size
- No server required

**Cons**:
- Requires significant refactoring
- Loses Next.js routing benefits
- More complex architecture

### Option 3: Progressive Web App (PWA)
- Deploy web app normally with SSR
- Use PWA capabilities for mobile experience
- Add to home screen functionality

**Pros**:
- No native app needed
- Instant updates
- Simpler deployment

**Cons**:
- Limited native capabilities
- Requires internet connection
- Not in app stores

## ✅ DECISION: Option 1 - Standalone Build

**Date**: October 10, 2025
**Decided By**: Project Team

**Chosen Approach**: Next.js Standalone Build with embedded Node.js server

**Rationale**:
1. **Minimal Code Changes**: Existing codebase works as-is with all Next.js features
2. **Full Feature Support**: Dynamic routes, API routes, SSR, and middleware all work
3. **Best User Experience**: Native mobile feel with complete functionality
4. **Industry Standard**: Standard approach for Capacitor + Next.js applications
5. **OpenAI SDK Compatible**: Supports iframes required for OpenAI Apps SDK integration

**Trade-offs Accepted**:
- Slightly larger app size (~10-15MB for Node.js runtime)
- Minimal battery impact (server only runs when app is active)
- Native packaging handles Node.js runtime automatically

**Next Actions**: Proceed to Phase 2 implementation

## Next Steps 📋

### Phase 2: Implement Standalone Build (CURRENT)
1. **Update Next.js Configuration**:
   - Change `output: 'standalone'` in `next.config.ts`
   - Keep mobile build conditional
   - Configure for embedded server

2. **Create Server Wrapper**:
   - Create `/capacitor-server/index.js` for Node.js server
   - Handle port management and lifecycle
   - Add error handling and logging

3. **Update Build Process**:
   - Modify `scripts/build-mobile.sh` for standalone output
   - Configure Capacitor to bundle Node.js runtime
   - Test build pipeline

4. **Test & Validate**:
   - Verify dynamic routes work (/chat/[id])
   - Test API routes functionality
   - Validate iframe support for OpenAI SDK

### Phase 3: Native Features
Once core build works:
- Add Capacitor plugins (Camera, Storage, etc.)
- Configure app icons and splash screens
- Set up push notifications
- Add native navigation

## Files Modified

```
.gitignore                      # Added Capacitor directories
next.config.ts                  # Conditional static export
middleware.ts                   # Added CORS for mobile
lib/config.ts                  # NEW: API configuration
.env.example                    # Added NEXT_PUBLIC_API_BASE_URL
capacitor.config.ts            # NEW: Capacitor configuration
scripts/build-mobile.sh        # NEW: Mobile build script
package.json                    # Added Capacitor packages + scripts
app/(dashboard)/chat/[id]/page.tsx        # Server component wrapper
app/(dashboard)/chat/[id]/page.client.tsx # NEW: Client component
```

## Commands Reference

```bash
# Regular web build (with API routes, SSR)
npm run build

# Mobile build attempt (static export - currently blocked by dynamic routes)
npm run build:mobile

# Capacitor sync (after successful build)
npm run cap:sync

# Open in Xcode
npx cap open ios

# Open in Android Studio
npx cap open android
```

## Technical Debt
- ~~Need to resolve static export vs dynamic routes issue~~ → RESOLVED: Using standalone build
- ~~Consider implementing Option 1 (Standalone) for Phase 2~~ → DECIDED: Implementing standalone
- Add error handling for mobile API calls (Phase 2)
- Implement offline support (Phase 3)
- Add mobile-specific UI optimizations (Phase 3)
- Configure Node.js server lifecycle management (Phase 2)

---
**Date**: October 10, 2025
**Capacitor Version**: 7.4.3
**Next.js Version**: 15.5.0
**Status**: ✅ Phase 1 Complete - Ready for Phase 2 (Standalone Build Implementation)

## 🚀 Continuation Prompt for Phase 2

Use this prompt in a new conversation to continue the work:

```
CONTEXT: We're implementing Capacitor v7 for iOS/Android mobile apps for the Ampel platform (Next.js 14 app).

CURRENT STATE:
- Phase 1 is complete (see /docs/mobile/capacitor-phase1-summary.md)
- Capacitor v7.4.3 installed and initialized
- iOS and Android platforms added
- Build scripts created (scripts/build-mobile.sh)
- DECISION: Implementing Option 1 - Next.js Standalone Build

OBJECTIVE: Phase 2 - Configure Next.js standalone build for Capacitor

REQUIREMENTS:
1. Update next.config.ts:
   - Change from output: 'export' to output: 'standalone'
   - Keep mobile build conditional (NEXT_PUBLIC_BUILD_TARGET=mobile)
   - Keep images.unoptimized for mobile

2. Update capacitor.config.ts:
   - Add server configuration for standalone build
   - Configure localhost URLs for local server

3. Create Node.js server wrapper:
   - Create /capacitor-server/index.js to start Next.js standalone server
   - Handle port management
   - Proper error handling and logging

4. Update build scripts:
   - Modify scripts/build-mobile.sh for standalone build
   - Copy standalone output to appropriate location
   - Include Node.js server files

5. Test builds:
   - npm run build:mobile should create standalone build
   - npm run cap:sync should work
   - Verify /.next/standalone directory structure

6. Document changes:
   - Update /docs/mobile/capacitor-phase1-summary.md with Phase 2 progress
   - Add setup instructions for developers

CRITICAL: Must support iframes for OpenAI Apps SDK integration (already configured).

Please implement Phase 2 following the standalone build approach.
```
