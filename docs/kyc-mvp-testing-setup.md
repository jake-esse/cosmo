# KYC MVP Testing Setup

This document summarizes the MVP testing infrastructure added to the KYC implementation.

## Files Created

### 1. `/docs/kyc-test-checklist.md`
Manual testing checklist covering:
- Desktop flow (QR code, polling, redirects)
- Mobile flow (device detection, Persona redirect)
- Result pages (success, retry, fail, pending)
- Edge cases (session expiration, duplicates, errors)
- Callback routing
- Browser compatibility
- Database state validation
- Security checks

**Purpose:** Systematic manual testing before launch. No test automation for MVP.

### 2. `/lib/kyc/edge-cases.ts`
Critical edge case handlers:
- `isSessionExpired()`: Check if session expired (30 min)
- `invalidateOldSessions()`: Auto-expire old sessions when user starts new one
- `hasExistingVerification()`: Check for existing Persona account
- `getLatestActiveSession()`: Get user's current in-progress session

**Deferred to post-launch:**
- Network failure handling (user can refresh)
- Persona downtime (generic error message)
- Multiple tabs (acceptable UX issue)
- Back button handling (browser handles reasonably)
- Mobile app deep linking

### 3. `/lib/kyc/config-validation.ts`
Validates required environment variables on startup:
- `PERSONA_API_KEY`
- `PERSONA_TEMPLATE_ID`
- `PERSONA_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`

**Behavior:**
- Development: Logs errors, doesn't throw
- Production: Throws error to prevent deployment with missing config
- Auto-runs on server startup via import in `app/layout.tsx`

## Updated Files

### API Routes - Improved Error Logging
All KYC API routes now use structured error logging with format:
```typescript
console.error('[KYC {Route}] {Context}:', {
  userId,
  error: error.message,
  timestamp: new Date().toISOString(),
  // ... other relevant context
})
```

**Updated routes:**
1. `/app/api/kyc/initiate/route.ts`
   - Added `invalidateOldSessions()` call after session creation
   - Structured error logging for all catch blocks
   - Returns session data to get ID for invalidation

2. `/app/api/kyc/callback/route.ts`
   - Structured error logging for all errors
   - Better context in all error logs (inquiry ID, user ID, etc.)

3. `/app/api/kyc/status/route.ts`
   - Structured error logging for all errors
   - Consistent format across all error types

4. `/app/api/kyc/mobile-start/[token]/route.ts`
   - Structured error logging for all errors
   - Better context in error messages

### Root Layout
`/app/layout.tsx`
- Imports config validation which runs on server startup
- Fails fast if required env vars missing in production

## Error Logging Format

All errors now follow consistent format:
```
[KYC {Context}] {Description}: {
  userId: string,
  error: string,
  timestamp: ISO string,
  ...other context
}
```

**Benefits:**
- Easy to grep logs by component: `[KYC Initiate]`, `[KYC Callback]`, etc.
- Structured data for future log aggregation (Datadog, Sentry, etc.)
- Timestamp for debugging race conditions
- User ID for user-specific debugging
- No sensitive data logged (no tokens, API keys, etc.)

## Testing Workflow

### Before Launch
1. Run through entire `/docs/kyc-test-checklist.md`
2. Test on multiple devices (iPhone, Android, desktop browsers)
3. Verify environment variables in production
4. Test error scenarios (expired sessions, invalid tokens, etc.)
5. Confirm database updates correctly for all flows

### During Launch
1. Monitor server logs for `[KYC` errors
2. Watch for config validation errors on deployment
3. Check Supabase for proper session/verification creation

### Post-Launch Improvements (Deferred)
- Add Sentry or similar error tracking
- Analytics for conversion funnel (start → complete)
- Automated E2E tests
- Advanced edge case handling (multiple tabs, network failures)
- Status page monitoring for Persona API
- Tab synchronization for better UX

## Known Acceptable Issues for MVP

These are documented but deferred to post-launch:
1. **Multiple tabs open**: May confuse users but won't break flow
2. **Back button**: Browser handles it, may require refresh
3. **Network failure during redirect**: User can refresh to continue
4. **Persona API downtime**: Generic error, user tries later

## Environment Setup

Required environment variables:
```bash
PERSONA_API_KEY=your_key_here
PERSONA_TEMPLATE_ID=your_template_id
PERSONA_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

Config validation will check these on startup and fail in production if missing.

## Next Steps

1. Complete manual testing checklist
2. Fix any ship-blocking bugs found
3. Deploy to staging
4. Run checklist again on staging
5. Deploy to production
6. Monitor logs for `[KYC` errors

## Support

For testing help or questions:
- Check `/docs/kyc-test-checklist.md` first
- Review error logs with `[KYC` prefix
- Check Supabase for session/verification state
- Review Persona dashboard for inquiry status
