# KYC Testing Checklist

## Desktop Flow
- [ ] Desktop detected correctly (test on Chrome/Safari desktop)
- [ ] QR code displays and is clear
- [ ] QR code scannable on iPhone
- [ ] QR code scannable on Android
- [ ] Status updates when mobile completes verification
- [ ] Redirects to /onboarding on success
- [ ] Countdown timer shows 30-minute expiration
- [ ] Email fallback button works (opens mailto:)

## Mobile Flow
- [ ] Mobile detected correctly (test on iPhone/Android)
- [ ] Redirects to Persona immediately
- [ ] Can complete verification on phone
- [ ] Success page shows with celebration animation
- [ ] Auto-redirect to /onboarding after 3 seconds
- [ ] Manual "Continue" button works

## Result Pages
- [ ] Success page: Shows celebration, redirects to /onboarding
- [ ] Retry page: Shows helpful tips, retry button works
- [ ] Fail page: Shows appropriate message based on reason
- [ ] Pending page: Shows manual review message

## Edge Cases (Critical Only)
- [ ] Session expiration (30 min) shows expiration message
- [ ] Duplicate account blocked with clear message
- [ ] Already verified user redirected to dashboard
- [ ] Invalid token shows error (mobile/[token] page)
- [ ] Expired token shows expiration message
- [ ] Error states show friendly messages (not raw errors)

## Callback Flow
- [ ] Persona redirects to /kyc/callback correctly
- [ ] Query params parsed (status, inquiry-id, kyc)
- [ ] Session storage cleared after callback
- [ ] Routes to correct result page based on status

## Webhook (Optional for MVP - can be tested post-launch)
- [ ] Webhook receives events from Persona
- [ ] Signature verification works
- [ ] Database updates correctly
- [ ] Handles all event types (inquiry.completed, inquiry.failed, etc.)

## Browser Compatibility
- [ ] Chrome (desktop + mobile)
- [ ] Safari (desktop + mobile)
- [ ] Firefox (desktop)
- [ ] Edge (desktop)

## Database State
- [ ] kyc_sessions created with correct status
- [ ] kyc_verifications updated on completion
- [ ] persona_accounts created on approval
- [ ] Old sessions invalidated when new one created

## Error Scenarios
- [ ] Network timeout during API call
- [ ] Persona API down (graceful error)
- [ ] Missing env vars logged on startup
- [ ] Invalid inquiry ID handled in callback

## Security
- [ ] Session tokens are UUIDs (not guessable)
- [ ] Only authenticated users can start KYC
- [ ] Duplicate prevention works (persona_accounts.user_id unique)
- [ ] Webhook signature verified (if webhook implemented)

## Known Acceptable Issues (Defer to Post-Launch)
- Multiple tabs: May cause confusion but won't break flow
- Back button: Browser handles it, may need refresh
- Network failure during redirect: User can refresh
- Persona downtime: Generic error, try later
