# Mobile Storage Strategy: Split Storage for Supabase Sessions

## Problem

Expo's SecureStore has a 2048 byte limit per item. Supabase session objects can exceed this limit because they contain:

- Access token (JWT, ~500-800 bytes)
- Refresh token (JWT, ~200-400 bytes)
- User metadata (can be large)
- Expiration times
- Other session data

When the session exceeds 2048 bytes, SecureStore throws an error, breaking authentication persistence.

**Warning from Expo:**
```
⚠️  Storing values larger than 2048 bytes in SecureStore is deprecated.
    This will fail in future versions of Expo SDK.
```

## Solution: Split Storage Strategy

We now use a **split storage adapter** that intelligently distributes session data:

### Storage Strategy

| Data | Storage | Reason |
|------|---------|--------|
| `refresh_token` | **SecureStore** | Most sensitive, small (~200-400 bytes), long-lived |
| Everything else | **AsyncStorage** | Large data, device-local security sufficient |

### Why This Works

1. **Refresh token is most critical**: With a valid refresh token, you can get new access tokens. This should be maximally secure.

2. **Access tokens are short-lived**: They expire in ~1 hour, so even if compromised from AsyncStorage (which is still device-local), the window of vulnerability is small.

3. **AsyncStorage is still secure**: Data is local to the device, not transmitted. Device-level security (encryption, biometrics) still apply.

4. **Size limitation solved**: AsyncStorage has no practical size limit.

5. **Future-proof**: Complies with Expo SDK security warnings.

## Implementation

### File Structure

```
/mobile/src/services/storage/
├── secure.ts              # SecureStore wrapper (for sensitive small data)
├── async.ts               # AsyncStorage wrapper (for large data)
└── supabase-adapter.ts    # Split storage adapter for Supabase
```

### How It Works

#### 1. Storing a Session

```typescript
// When Supabase saves a session:
await supabaseStorageAdapter.setItem('key', sessionJSON);

// Internally:
const session = JSON.parse(sessionJSON);

// Split the data:
const { refresh_token, ...rest } = session;

// Store refresh token securely (small, sensitive)
await SecureStore.setItem('ampel_refresh_token', refresh_token);

// Store everything else (large, less sensitive)
await AsyncStorage.setItem('ampel_session_data', JSON.stringify(rest));
```

#### 2. Retrieving a Session

```typescript
// When Supabase needs the session:
const sessionJSON = await supabaseStorageAdapter.getItem('key');

// Internally:
// Get refresh token from SecureStore
const refreshToken = await SecureStore.getItem('ampel_refresh_token');

// Get rest from AsyncStorage
const sessionData = await AsyncStorage.getItem('ampel_session_data');

// Reconstruct full session
const fullSession = {
  ...JSON.parse(sessionData),
  refresh_token: refreshToken
};

return JSON.stringify(fullSession);
```

#### 3. Removing a Session (Logout)

```typescript
// When user logs out:
await supabaseStorageAdapter.removeItem('key');

// Internally: Clear both storages
await Promise.all([
  SecureStore.deleteItem('ampel_refresh_token'),
  AsyncStorage.removeItem('ampel_session_data')
]);
```

### Code Example

```typescript
import { supabase } from '@/services/supabase';

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});
// ✅ Session automatically stored using split storage

// Session persists across app restarts
// ✅ Refresh token in SecureStore
// ✅ Session data in AsyncStorage

// Logout
await supabase.auth.signOut();
// ✅ Both storage locations cleared
```

## Files Changed

### New Files

1. **`/mobile/src/services/storage/async.ts`**
   - AsyncStorage wrapper with error handling
   - Storage keys constants
   - Used for large, non-sensitive data

2. **`/mobile/src/services/storage/supabase-adapter.ts`**
   - Custom storage adapter for Supabase
   - Implements split storage logic
   - Transparently handles splitting/reconstruction

### Modified Files

1. **`/mobile/src/services/supabase.ts`**
   - Changed from `secureStorageAdapter` to `supabaseStorageAdapter`
   - Updated comments to explain split storage strategy

## Benefits

### ✅ Solves Size Limit Issue
- No more 2048 byte SecureStore errors
- Future-proof for larger sessions

### ✅ Maintains Security
- Most sensitive token (refresh_token) still in SecureStore
- Device-level security still applies to AsyncStorage

### ✅ Transparent to Application
- No changes needed in app code
- Supabase client works exactly the same
- Session persistence still works

### ✅ Better Performance
- AsyncStorage is faster for large data
- SecureStore only used for small sensitive tokens

## Security Analysis

### What's in SecureStore (Maximum Security)
- ✅ `refresh_token` - Long-lived, can generate new access tokens

### What's in AsyncStorage (Device-Local Security)
- `access_token` - Short-lived (~1 hour), limited damage if compromised
- `user` object - User profile data (not credentials)
- `expires_at` - Timestamp (not sensitive)
- `token_type` - Just "bearer" (not sensitive)

### Why This Is Secure

1. **AsyncStorage is still private**: Data never leaves the device
2. **Device encryption**: iOS/Android encrypt app storage
3. **Access tokens expire quickly**: Limited window of vulnerability
4. **Refresh token is protected**: Can't generate new tokens without it
5. **No credentials stored**: Passwords never stored anywhere

## Migration

### For Existing Users

When the app updates:

1. **First login after update**:
   - Old SecureStore session might fail to load (if >2048 bytes)
   - User sees login screen (seamless, no error)
   - New login uses split storage

2. **Automatic cleanup**:
   - Old `ampel_auth_session` key in SecureStore is no longer used
   - Can be manually cleaned up with:
   ```typescript
   await SecureStore.deleteItemAsync('ampel_auth_session');
   ```

### No Breaking Changes

- App still works exactly the same
- No user action required
- No data loss

## Testing Checklist

- ✅ TypeScript type checks pass
- ✅ Login stores session correctly
- ✅ Session persists after app restart
- ✅ Auto-refresh works
- ✅ Logout clears both storage locations
- ✅ No SecureStore size warnings
- ✅ Works with large user metadata

## Monitoring

Watch for these in development:

```typescript
// Success messages
console.log('[SupabaseStorageAdapter] Session stored successfully');

// Error messages (should not appear)
console.error('[SupabaseStorageAdapter] Error storing session:', error);
console.error('[SecureStorage] Error setting item:', error);
console.error('[AsyncStorage] Error setting item:', error);
```

## Future Enhancements

### Optional: Add Encryption to AsyncStorage

If additional security is needed, we could encrypt session data before storing in AsyncStorage:

```typescript
// Before storing
const encrypted = await encryptData(sessionData);
await AsyncStorage.setItem(key, encrypted);

// When retrieving
const encrypted = await AsyncStorage.getItem(key);
const decrypted = await decryptData(encrypted);
```

This would provide defense-in-depth but may be overkill given:
- Device-level encryption already exists
- Access tokens are short-lived
- Refresh token is already in SecureStore

## Related Documentation

- [Mobile Environment Fix](./mobile-env-fix.md) - Environment variable configuration
- [Shared Config Migration](./shared-config-migration.md) - Cross-platform config system

## Summary

The split storage strategy solves the SecureStore size limit issue while maintaining security by:

1. ✅ Storing sensitive `refresh_token` in SecureStore (small, secure)
2. ✅ Storing session data in AsyncStorage (large, device-local)
3. ✅ Transparently reconstructing sessions when needed
4. ✅ No changes required to application code
5. ✅ Future-proof for Expo SDK updates

The most sensitive token (refresh_token) remains maximally protected, while large session data is stored appropriately for its security level and size requirements.
