# OAuth Provider Setup Guide

## Overview
This guide walks you through setting up OAuth authentication providers (Google, Apple, Facebook) for the Ampel platform. OAuth allows users to sign in using their existing accounts from these providers, streamlining the signup process and improving user experience.

**Benefits of OAuth:**
- Faster signup (no password creation needed)
- Trusted identity verification (skip email verification)
- Reduced friction for users
- Better security (providers handle authentication)

## Prerequisites

Before setting up OAuth providers:
- ✅ Active Supabase project
- ✅ Access to Supabase Dashboard
- ✅ Production domain configured (for Apple OAuth)
- ✅ Developer accounts for each provider you want to enable

## Important Notes

### Auth Callback Configuration
Your Next.js app already supports OAuth through the `/auth/callback` route. This route:
- Handles PKCE flow for all OAuth providers
- Exchanges authorization codes for sessions
- Bypasses email verification for OAuth users (trusts provider verification)
- Routes users appropriately based on onboarding status

### Redirect URLs
All OAuth providers will redirect to the same callback URL:
- **Development**: `http://localhost:3000/auth/callback`
- **Production**: `https://yourdomain.com/auth/callback`
- **Supabase Format**: `https://[PROJECT_REF].supabase.co/auth/v1/callback`

---

## 1. Google OAuth Setup (Required)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `Ampel Platform`
4. Click **Create**

### Step 2: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Click **Create**
4. Fill in the required fields:
   - **App name**: `Ampel`
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **Save and Continue**
6. On the **Scopes** screen, click **Add or Remove Scopes**
7. Select:
   - `userinfo.email`
   - `userinfo.profile`
8. Click **Update** → **Save and Continue**
9. Add test users (if in development mode)
10. Click **Save and Continue** → **Back to Dashboard**

### Step 3: Create OAuth Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Select **Web application**
4. Configure:
   - **Name**: `Ampel Web App`
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
     - `https://[PROJECT_REF].supabase.co` (Supabase)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/callback`
     - `https://yourdomain.com/auth/callback`
     - `https://[PROJECT_REF].supabase.co/auth/v1/callback`
5. Click **Create**
6. **Copy** your Client ID and Client Secret (you'll need these)

### Step 4: Configure in Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list
5. Toggle **Enable Sign in with Google**
6. Enter your credentials:
   - **Client ID**: Paste from Google Cloud Console
   - **Client Secret**: Paste from Google Cloud Console
7. Verify the **Redirect URL** matches: `https://[PROJECT_REF].supabase.co/auth/v1/callback`
8. Click **Save**

### Step 5: Update Environment Variables

Add to your `.env.local`:
```env
# Not strictly required for Supabase-managed OAuth, but useful for reference
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```

### Testing Google OAuth

1. Run your dev server: `npm run dev`
2. Navigate to login page
3. Click "Sign in with Google" button (when implemented in UI)
4. Complete Google sign-in flow
5. Verify redirect to `/chat` or appropriate onboarding screen
6. Check Supabase Dashboard → **Authentication** → **Users** for new user entry

---

## 2. Apple OAuth Setup (Required)

Apple OAuth is more complex and requires an active Apple Developer account ($99/year).

### Step 1: Create App ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **+** button
4. Select **App IDs** → **Continue**
5. Select **App** → **Continue**
6. Configure:
   - **Description**: `Ampel Platform`
   - **Bundle ID**: `com.ampel.platform` (must be unique)
7. Under **Capabilities**, enable **Sign in with Apple**
8. Click **Continue** → **Register**

### Step 2: Create Services ID

1. In **Identifiers**, click **+** button
2. Select **Services IDs** → **Continue**
3. Configure:
   - **Description**: `Ampel Web Auth`
   - **Identifier**: `com.ampel.platform.web` (must be unique)
4. Check **Sign in with Apple**
5. Click **Configure** next to Sign in with Apple
6. Configure domains and URLs:
   - **Primary App ID**: Select the App ID you created
   - **Domains and Subdomains**:
     - `yourdomain.com`
     - `[PROJECT_REF].supabase.co`
   - **Return URLs**:
     - `https://yourdomain.com/auth/callback`
     - `https://[PROJECT_REF].supabase.co/auth/v1/callback`
7. Click **Save** → **Continue** → **Register**
8. **Note your Services ID** (e.g., `com.ampel.platform.web`)

### Step 3: Create Private Key

1. In **Certificates, Identifiers & Profiles**, click **Keys**
2. Click **+** button
3. Configure:
   - **Key Name**: `Ampel Sign in with Apple Key`
4. Check **Sign in with Apple**
5. Click **Configure** → Select your Primary App ID
6. Click **Save** → **Continue** → **Register**
7. **Download the key file** (.p8 file) - you can only download once!
8. **Note your Key ID** (shown after download)
9. **Note your Team ID** (found in top-right of Apple Developer Portal)

### Step 4: Configure in Supabase Dashboard

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Apple** in the list
3. Toggle **Enable Sign in with Apple**
4. Enter your credentials:
   - **Services ID**: Your Services ID (e.g., `com.ampel.platform.web`)
   - **Team ID**: Found in Apple Developer Portal
   - **Key ID**: From the key creation step
   - **Private Key**: Open the .p8 file and paste the entire contents
5. Verify the **Redirect URL**: `https://[PROJECT_REF].supabase.co/auth/v1/callback`
6. Click **Save**

### Step 5: Update Environment Variables

Add to your `.env.local`:
```env
# Reference only - Supabase manages these
NEXT_PUBLIC_APPLE_CLIENT_ID=com.ampel.platform.web
```

### Testing Apple OAuth

1. **Important**: Apple OAuth requires HTTPS in production
2. For development, you can test using a tunneling service (ngrok, Cloudflare Tunnel)
3. Or deploy to production/staging environment
4. Click "Sign in with Apple" button
5. Complete Apple sign-in flow
6. Verify user creation in Supabase Dashboard

---

## 3. Facebook OAuth Setup (Optional)

### Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Consumer** use case → **Next**
4. Configure:
   - **App Name**: `Ampel`
   - **App Contact Email**: Your email
5. Click **Create App**

### Step 2: Add Facebook Login

1. From your app dashboard, click **Add Product**
2. Find **Facebook Login** → Click **Set Up**
3. Select **Web** platform
4. Enter your Site URL: `https://yourdomain.com`
5. Click **Save** → **Continue**

### Step 3: Configure Facebook Login Settings

1. In left sidebar, click **Facebook Login** → **Settings**
2. Configure **Valid OAuth Redirect URIs**:
   - `http://localhost:3000/auth/callback`
   - `https://yourdomain.com/auth/callback`
   - `https://[PROJECT_REF].supabase.co/auth/v1/callback`
3. Click **Save Changes**

### Step 4: Get App Credentials

1. In left sidebar, click **Settings** → **Basic**
2. **Copy** your App ID
3. Click **Show** next to App Secret
4. **Copy** your App Secret

### Step 5: Configure in Supabase Dashboard

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Facebook** in the list
3. Toggle **Enable Sign in with Facebook**
4. Enter your credentials:
   - **Client ID**: Your Facebook App ID
   - **Client Secret**: Your Facebook App Secret
5. Verify the **Redirect URL**: `https://[PROJECT_REF].supabase.co/auth/v1/callback`
6. Click **Save**

### Step 6: Make App Public (Production Only)

1. In Facebook App Dashboard, click **Settings** → **Basic**
2. Scroll to **App Mode**
3. Switch from **Development** to **Live**
4. Complete the required App Review items

### Step 7: Update Environment Variables

Add to your `.env.local`:
```env
# Reference only - Supabase manages these
NEXT_PUBLIC_FACEBOOK_CLIENT_ID=your_facebook_app_id
```

### Testing Facebook OAuth

1. Run your dev server: `npm run dev`
2. Click "Sign in with Facebook" button
3. Complete Facebook sign-in flow
4. Verify user creation in Supabase Dashboard

---

## OAuth Scopes Reference

### Google
- `email` - Access to user's email address (required)
- `profile` - Access to user's basic profile info (name, picture)
- `openid` - OpenID Connect support (automatically included)

### Apple
- `email` - Access to user's email (may be proxied by Apple)
- `name` - Access to user's full name (only provided on first sign-in)

### Facebook
- `email` - Access to user's email address
- `public_profile` - Access to public profile information (name, picture)

**Note**: All scopes are configured automatically by Supabase when you enable the provider.

---

## Redirect URL Configuration Summary

All providers use the same redirect pattern:

| Environment | Your App Callback | Supabase OAuth Callback |
|-------------|-------------------|------------------------|
| Development | `http://localhost:3000/auth/callback` | `https://[PROJECT_REF].supabase.co/auth/v1/callback` |
| Production | `https://yourdomain.com/auth/callback` | `https://[PROJECT_REF].supabase.co/auth/v1/callback` |

**How it works:**
1. User clicks "Sign in with [Provider]"
2. User redirected to provider's OAuth page
3. User authenticates and approves
4. Provider redirects to Supabase: `https://[PROJECT_REF].supabase.co/auth/v1/callback?code=...`
5. Supabase exchanges code for tokens
6. Supabase redirects to your app: `http://localhost:3000/auth/callback?code=...`
7. Your app exchanges code for session via `/app/auth/callback/route.ts`
8. User redirected to appropriate page based on onboarding status

---

## Email Verification for OAuth Users

OAuth users **skip email verification** because:
- The provider (Google, Apple, Facebook) has already verified the email
- We trust the provider's verification process
- This is handled automatically in `/app/auth/callback/route.ts`

The callback route checks if the user is coming from OAuth and:
- Immediately sets `email_verified_at` timestamp
- Awards signup bonuses
- Routes to appropriate onboarding screen

---

## Troubleshooting

### Common Issues

#### 1. Redirect URI Mismatch
**Error**: `redirect_uri_mismatch` or `invalid_redirect_uri`

**Solution**:
- Verify URLs are **exactly** the same in provider console and Supabase
- Include `http://` or `https://` protocol
- Don't include trailing slashes
- Check for typos in domain name
- For development, ensure `localhost:3000` is listed

#### 2. OAuth Popup Blocked
**Error**: Popup window doesn't open or is blocked

**Solution**:
- Ensure user action triggered the OAuth flow (button click)
- Check browser popup blocker settings
- Use redirect flow instead of popup (Supabase default)

#### 3. Missing Scopes
**Error**: Email or profile data not available after OAuth

**Solution**:
- Verify scopes are enabled in Supabase Dashboard
- Check provider consent screen configuration
- Re-authenticate to grant new scopes
- For Apple: Name is only provided on first sign-in

#### 4. Apple OAuth Not Working in Development
**Error**: Apple OAuth fails on localhost

**Solution**:
- Apple requires HTTPS for OAuth
- Use ngrok or Cloudflare Tunnel for local HTTPS
- Or test in production/staging environment
- Update Apple Services ID with tunneled URL

#### 5. Facebook App in Development Mode
**Error**: "App Not Setup: This app is still in development mode"

**Solution**:
- Add your Facebook account as a test user
- Or switch app to Live mode (for production)
- Complete Facebook App Review if required

#### 6. User Already Exists with Different Provider
**Error**: User tries to sign in with Google but already has email/password account

**Solution**:
- Supabase handles this by linking accounts automatically
- Or show user a message to use their original sign-in method
- Consider implementing account linking UI

#### 7. Invalid Client ID/Secret
**Error**: `invalid_client` or authentication fails immediately

**Solution**:
- Verify credentials are copied correctly (no extra spaces)
- Check credentials are from the correct environment (dev vs prod)
- Regenerate credentials if needed
- For Apple: Verify .p8 key format (should include BEGIN/END markers)

#### 8. CORS Errors
**Error**: CORS policy blocks OAuth request

**Solution**:
- Add authorized JavaScript origins in provider console
- Verify Supabase URL is whitelisted
- Check browser console for specific CORS error details

---

## Security Best Practices

1. **Never commit credentials to git**
   - Use `.env.local` for local development (gitignored)
   - Use environment variables in production

2. **Rotate secrets regularly**
   - Especially after team member departures
   - If credentials are accidentally exposed

3. **Use different OAuth apps for dev/staging/prod**
   - Prevents testing from affecting production metrics
   - Easier to debug issues in specific environments

4. **Monitor OAuth usage**
   - Check provider dashboards for unusual activity
   - Set up alerts for quota limits
   - Review Supabase auth logs regularly

5. **Keep provider apps up to date**
   - Review and approve new scope requests
   - Update redirect URIs when deploying to new domains
   - Maintain valid contact information

---

## Next Steps

### 1. Implement OAuth UI Buttons
Create sign-in buttons for each provider in your login/signup pages:
- `/app/(auth)/login/page.tsx`
- `/app/(auth)/signup/page.tsx`

Example implementation:
```tsx
import { createClient } from '@/lib/supabase/client'

async function signInWithGoogle() {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  if (error) console.error('Error:', error.message)
}
```

### 2. Style OAuth Buttons
Use provider-specific branding guidelines:
- [Google Sign-In Branding](https://developers.google.com/identity/branding-guidelines)
- [Apple Sign-In Guidelines](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)
- [Facebook Login Button](https://developers.facebook.com/docs/facebook-login/userexperience)

### 3. Handle OAuth Errors
Add error handling and user feedback:
- Show error messages when OAuth fails
- Log errors for debugging
- Provide fallback to email/password auth

### 4. Test End-to-End Flow
- Test each provider in development
- Verify user profile creation
- Check equity bonus awards
- Test referral code application
- Verify routing to appropriate screens

### 5. Update Documentation
- Document OAuth flow in `/app/(auth)/CLAUDE.md`
- Update user-facing docs with OAuth options
- Create internal runbook for OAuth troubleshooting

---

## Provider Comparison

| Feature | Google | Apple | Facebook |
|---------|--------|-------|----------|
| Setup Difficulty | Easy | Hard | Medium |
| Cost | Free | $99/year | Free |
| Email Access | Always | Sometimes proxied | Always |
| Profile Photo | Yes | No | Yes |
| Requires HTTPS | No (dev ok) | Yes | No (dev ok) |
| Mobile Support | Excellent | Excellent | Good |
| User Trust | High | High | Medium |
| Privacy Focus | Medium | Very High | Low |

**Recommendation**:
- Start with **Google** (easiest, most popular)
- Add **Apple** for iOS users and privacy-conscious users
- Add **Facebook** if your audience uses it heavily

---

## Support Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase OAuth Guide](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)

---

**Last Updated**: 2025-10-07
**Maintainer**: Ampel Engineering Team
