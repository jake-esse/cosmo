# Authentication Flow Documentation

## Overview
The Cosmo platform authentication system integrates with Supabase Auth and our custom equity system to provide a seamless onboarding experience where users earn points immediately upon signup.

## Authentication Flow

### 1. User Signup
**Route**: `/signup`

**Process**:
1. User fills out signup form with:
   - Full Name (displayed throughout app)
   - Email (primary identifier)
   - Password
   - Referral code (optional)
   - Terms acceptance

2. Server action `signUp()` is called:
   - Creates Supabase auth user
   - Auto-generates username from email
   - Passes metadata (full_name, display_name, auto-generated username, referral_code)
   - Sends confirmation email

3. Database trigger `on_auth_user_created`:
   - Creates profile record
   - Generates unique username if collision occurs
   - Sets display_name from full_name
   - Generates unique referral code
   - Awards 100 signup bonus points via `award_equity_points()`
   - Creates referral record if code provided

4. User receives email with verification link

### 2. Email Verification
**Route**: `/auth/callback`

**Process**:
1. User clicks verification link
2. Callback exchanges code for session
3. If user was referred:
   - Completes referral via `complete_referral()`
   - Awards 50 points to referrer
   - Awards 25 points to referred user
4. Redirects to dashboard

### 3. User Login
**Route**: `/login`

**Process**:
1. User enters email and password
2. Server action `signIn()` authenticates
3. Session created via cookies
4. Redirects to dashboard

### 4. Password Reset
**Routes**: `/reset-password`, `/reset-password/confirm`

**Process**:
1. User requests reset with email
2. Reset link sent to email
3. User clicks link and sets new password
4. Password updated via `updatePassword()`

## Equity Integration

### Automatic Point Awards
- **Signup**: 100 points (immediate)
- **Referral (referrer)**: 50 points (on referred user verification)
- **Referral (referred)**: 25 points (on email verification)

### Database Operations
All equity operations use the `award_equity_points()` function which:
- Ensures idempotency via request_id
- Maintains balance integrity
- Creates immutable transaction records
- Logs user interactions

## Middleware Protection

The middleware (`/middleware.ts`) protects routes:
- `/dashboard/*` requires authentication
- Redirects unauthenticated users to `/login`
- Redirects authenticated users from auth pages to dashboard

## Server Actions

Located in `/app/(auth)/actions.ts`:

### signUp(formData)
- Creates new user account
- Triggers equity bonus
- Handles referral codes

### signIn(formData)
- Authenticates user
- Creates session
- Redirects to dashboard

### signOut()
- Clears session
- Redirects to login

### resetPassword(formData)
- Sends password reset email
- Returns success/error status

### updatePassword(formData)
- Updates user password
- Requires valid session

### completeUserReferral(userId)
- Awards referral bonuses
- Updates referral status
- Admin operation only

### getUserBalance(userId)
- Fetches current equity balance
- Returns balance details

## UI Components

### Auth Layout
- Gradient background (violet/purple/indigo)
- Centered card design
- Cosmo branding
- Mobile responsive

### Form Features
- Real-time validation
- Loading states
- Error messages
- Success notifications
- Password confirmation
- Terms acceptance

### Dashboard
- Displays equity balance
- Shows referral code
- Copy-to-clipboard functionality
- Transaction count
- Coming soon sections

## Security Considerations

1. **Password Requirements**:
   - Minimum 6 characters
   - Confirmation required on signup

2. **Session Management**:
   - HTTPOnly cookies
   - Secure flag in production
   - Auto-refresh tokens

3. **RLS Policies**:
   - Users can only view own data
   - Equity transactions are read-only
   - Admin operations via service role

4. **Idempotency**:
   - Request IDs prevent duplicate transactions
   - Especially important for equity awards

## Error Handling

All forms include:
- Try/catch blocks
- User-friendly error messages
- Network error handling
- Validation feedback

## Key Changes (2025-08-22)

### Email-Based Signup
- **Username**: Now auto-generated from email, not user-facing
- **Display Name**: User's full name shown throughout the app
- **Collision Handling**: Automatic retry with numbered suffixes
- **Error Messages**: More user-friendly (e.g., "An account with this email already exists")

### Database Functions
- `generate_unique_username(email)`: Creates unique username from email
- `get_user_display_info(user_id)`: Returns display information for UI

## Testing Checklist

- [ ] Signup creates user with auto-generated username
- [ ] No username collision errors occur
- [ ] Display name (full name) appears in dashboard
- [ ] Signup awards 100 points
- [ ] Email verification works
- [ ] Referral codes award correct points
- [ ] Login/logout functionality
- [ ] Password reset flow
- [ ] Protected routes redirect properly
- [ ] Dashboard shows correct balance
- [ ] Mobile responsive design
- [ ] Error states display correctly

## Future Enhancements

1. **OAuth Providers**:
   - Google Sign-In
   - GitHub Sign-In
   - Apple Sign-In

2. **Enhanced Security**:
   - 2FA support
   - Device tracking
   - Session management UI

3. **Profile Features**:
   - Avatar upload
   - Profile editing
   - Account settings

4. **Gamification**:
   - Daily login streaks
   - Achievement system
   - Leaderboards