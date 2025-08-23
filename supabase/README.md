# Supabase Database Migrations

## Running Migrations

To apply these migrations to your Supabase project:

1. **Via Supabase Dashboard**:
   - Go to SQL Editor in your Supabase Dashboard
   - Copy and paste migration files in order
   - Run each migration

2. **Via Supabase CLI**:
   ```bash
   supabase db push
   ```

## Migration Files

### 001_initial_schema.sql
- Creates all initial tables (profiles, equity_transactions, etc.)
- Sets up RLS policies
- Creates helper functions
- Establishes triggers for profile creation and equity

### 002_fix_profile_creation_and_equity.sql
- Fixes the `handle_new_user()` trigger
- Creates profiles for existing users without them
- Awards missing signup bonuses
- Adds `fix_user_profile_and_equity()` helper function

### 003_verification_queries.sql
- Contains queries to verify the system is working
- Check user counts, balances, and missing data
- Not a migration - just helpful queries for testing

### 004_email_based_signup.sql
- Removes username as user-facing requirement
- Auto-generates unique usernames from email addresses
- Adds `generate_unique_username()` function with collision handling
- Updates `handle_new_user()` trigger with retry logic
- Creates `get_user_display_info()` helper function
- Backfills display names for existing users

### 005_email_signup_verification.sql
- Verification queries for the email-based signup system
- Tests username generation with various email formats
- Checks for duplicates and display name coverage
- Not a migration - testing queries only

### 006_fix_display_info_function.sql
- Fixes type mismatch error in `get_user_display_info` function
- Run this if you get "structure of query does not match function result type"
- Adds explicit type casting for VARCHAR to TEXT conversion

### 007_diagnose_signup_error.sql
- Diagnostic queries to identify signup failures
- Checks trigger status, constraints, and recent errors
- Not a migration - diagnostic queries only

### 008_fix_referral_code_generation.sql
- **CRITICAL FIX**: Resolves "Database error saving new user"
- Ensures referral_code is generated for all profiles (NOT NULL constraint)
- Updates handle_new_user trigger to generate unique 8-character codes
- Backfills missing referral codes for existing profiles
- Includes retry logic for race conditions

### 009_verify_signup_fix.sql
- Comprehensive verification after applying migration 008
- Checks system health, referral code uniqueness, and signup flow
- Not a migration - verification queries only

## Troubleshooting

If a user doesn't have a profile or equity points:

1. Run the verification queries to identify the issue
2. Use the fix function:
   ```sql
   SELECT * FROM public.fix_user_profile_and_equity('user-id-here');
   ```

## Testing New User Signup

After applying migrations, test with:
1. Create a new user via the app
2. Check that profile is created
3. Verify 100 equity points are awarded
4. Test referral codes if applicable