# Email SMTP Setup Guide

## Issue
Supabase's default email service has a **rate limit of 2 emails per hour** for development. This is insufficient for testing and production.

## Solution: Configure Custom SMTP

### Recommended Providers
1. **Resend** (Recommended) - 100 free emails/day, great developer experience
2. **SendGrid** - 100 free emails/day
3. **AWS SES** - Very cheap, requires more setup
4. **Mailgun** - Good alternative

### Setup Steps (Resend Example)

#### 1. Create Resend Account
- Go to https://resend.com
- Sign up for free account
- Verify your domain (or use their testing domain)

#### 2. Get API Key
- Navigate to API Keys section
- Create new API key
- Copy the API key

#### 3. Configure Supabase
Go to your Supabase project:
1. Navigate to: **Authentication → Email Templates**
2. Scroll to **SMTP Settings**
3. Enter the following:
   ```
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: [YOUR_RESEND_API_KEY]
   Sender email: onboarding@yourdomain.com
   Sender name: Ampel
   ```
4. Click "Save"

#### 4. Test Configuration
- Try signing up a new user
- Email should be sent immediately
- Check Resend dashboard for delivery logs

### Environment Variables (Optional)
If using self-hosted Supabase, add to `.env`:
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=your_resend_api_key
SMTP_SENDER_EMAIL=onboarding@yourdomain.com
SMTP_SENDER_NAME=Ampel
```

### Email Templates
Customize your email templates in Supabase Dashboard:
- Confirmation Email (Signup)
- Magic Link Email
- Password Recovery
- Email Change Confirmation

### Rate Limits After SMTP Setup
With custom SMTP, you're limited only by your provider:
- **Resend Free**: 100 emails/day
- **Resend Pro**: 50,000+ emails/month
- **SendGrid Free**: 100 emails/day

### Troubleshooting
- **Emails not sending**: Check SMTP credentials
- **Emails in spam**: Configure SPF, DKIM records
- **Connection errors**: Ensure port 587 is not blocked

### Testing Manually
For testing without waiting for rate limit:
1. Go to Supabase Dashboard → Authentication → Users
2. Find the unconfirmed user
3. Manually confirm their email
4. This bypasses the email sending

## Current Status
- Default email service: **2 emails/hour limit** ❌
- Custom SMTP: **Unlimited (provider-dependent)** ✅

## Next Steps
1. Set up custom SMTP (recommended before production)
2. Test the full signup → email → verification flow
3. Monitor email delivery in provider dashboard
