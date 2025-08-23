# Cosmo Platform Database Schema

## Overview
The Cosmo platform uses a blockchain-ready, event-sourced architecture with an immutable equity ledger. This design ensures complete auditability, supports future blockchain migration, and maintains data integrity through append-only patterns.

## Core Design Principles

### 1. Event Sourcing
- All user actions are recorded in `user_interactions` table
- Each interaction can trigger equity transactions
- Complete audit trail of all system events

### 2. Immutable Equity Ledger
- `equity_transactions` table is append-only
- No UPDATE or DELETE operations allowed
- Triggers enforce immutability at database level
- Each transaction records balance_before and balance_after

### 3. Idempotency
- Request IDs prevent duplicate transactions
- Critical for distributed systems and retry logic
- Ensures exactly-once processing

### 4. Blockchain Ready
- Fields for block_height, transaction_hash, signature
- Merkle proof support for verification
- Designed for eventual on-chain migration

## Database Tables

### Core Tables

#### profiles
Extends Supabase auth.users with additional user information.
- `id` (UUID): References auth.users
- `username` (TEXT): Unique username
- `display_name` (TEXT): Display name
- `avatar_url` (TEXT): Profile picture URL
- `referral_code` (TEXT): Unique 8-character code
- `referred_by` (UUID): Reference to referrer

#### user_interactions
Append-only event log of all user actions.
- `id` (UUID): Primary key
- `user_id` (UUID): User who performed action
- `action_type` (ENUM): Type of action performed
- `request_id` (TEXT): Unique ID for idempotency
- `action_metadata` (JSONB): Additional action data
- `ip_address` (INET): User's IP address
- `user_agent` (TEXT): Browser/client information

#### equity_transactions
Immutable ledger of all equity point transactions.
- `id` (UUID): Primary key
- `user_id` (UUID): User receiving/spending points
- `interaction_id` (UUID): Related user interaction
- `amount` (DECIMAL): Points amount (18,8 precision)
- `transaction_type` (ENUM): credit or debit
- `balance_before` (DECIMAL): Balance before transaction
- `balance_after` (DECIMAL): Balance after transaction
- **Blockchain fields:**
  - `block_height` (BIGINT): Blockchain block number
  - `transaction_hash` (TEXT): On-chain transaction hash
  - `signature` (TEXT): Cryptographic signature
  - `merkle_proof` (JSONB): Merkle tree proof

### Chat & AI Tables

#### conversations
Stores chat conversations with AI.
- `id` (UUID): Primary key
- `user_id` (UUID): Owner of conversation
- `title` (TEXT): Conversation title
- `model` (TEXT): AI model used
- `total_tokens_used` (INTEGER): Token consumption
- `last_message_at` (TIMESTAMPTZ): Last activity

#### messages
Individual messages within conversations.
- `id` (UUID): Primary key
- `conversation_id` (UUID): Parent conversation
- `role` (TEXT): user/assistant/system
- `content` (TEXT): Message content
- `tokens_used` (INTEGER): Tokens for this message

### Referral System

#### referrals
Tracks referral relationships and rewards.
- `id` (UUID): Primary key
- `referrer_id` (UUID): User who made referral
- `referred_id` (UUID): User who was referred
- `status` (ENUM): pending/completed/expired
- `referrer_reward_transaction_id` (UUID): Reward transaction
- `referred_reward_transaction_id` (UUID): Bonus transaction

### Subscription System

#### subscription_tiers
Available subscription plans.
- `id` (UUID): Primary key
- `name` (TEXT): Internal name (free/pro/business)
- `price_monthly` (DECIMAL): Monthly price
- `equity_multiplier` (DECIMAL): Points multiplier
- `features` (JSONB): Array of feature strings

#### user_subscriptions
Active user subscriptions.
- `id` (UUID): Primary key
- `user_id` (UUID): Subscriber
- `tier_id` (UUID): Subscription tier
- `status` (ENUM): active/cancelled/expired
- `stripe_subscription_id` (TEXT): Stripe reference

### Future Multi-App Support

#### apps
Third-party apps in the ecosystem.
- `id` (UUID): Primary key
- `name` (TEXT): App name
- `slug` (TEXT): URL slug
- `equity_pool_size` (DECIMAL): Total points available
- `equity_distributed` (DECIMAL): Points distributed

#### user_apps
User app installations.
- `id` (UUID): Primary key
- `user_id` (UUID): User
- `app_id` (UUID): Installed app
- `installed_at` (TIMESTAMPTZ): Installation time
- `usage_count` (INTEGER): Usage metrics

### Audit & Compliance

#### audit_logs
Complete audit trail of all database changes.
- `id` (UUID): Primary key
- `table_name` (TEXT): Affected table
- `operation` (TEXT): INSERT/UPDATE/DELETE
- `user_id` (UUID): User who made change
- `old_data` (JSONB): Previous values
- `new_data` (JSONB): New values

## Materialized Views

### equity_balances
Pre-calculated user balances for performance.
- `user_id` (UUID): User
- `current_balance` (DECIMAL): Current point balance
- `total_earned` (DECIMAL): Lifetime earnings
- `total_spent` (DECIMAL): Lifetime spending
- `transaction_count` (BIGINT): Number of transactions

Refresh with: `SELECT refresh_equity_balances();`

## Helper Functions

### award_equity_points()
Awards points to a user with idempotency support.
```sql
SELECT award_equity_points(
  p_user_id => 'user-uuid',
  p_action_type => 'signup',
  p_amount => 100,
  p_request_id => 'unique-request-id',
  p_description => 'Welcome bonus'
);
```

### get_user_balance()
Returns complete balance information for a user.
```sql
SELECT * FROM get_user_balance('user-uuid');
```

### verify_transaction_integrity()
Validates the transaction chain for a user.
```sql
SELECT verify_transaction_integrity('user-uuid');
```

### complete_referral()
Completes a referral and awards points to both parties.
```sql
SELECT complete_referral('referred-user-uuid');
```

## Enums

### action_type
- signup
- referral_completed
- daily_active
- chat_message
- subscription_start
- subscription_renewal
- subscription_cancel
- app_install
- app_usage
- achievement_unlock
- milestone_reached

### transaction_type
- credit (adding points)
- debit (spending points)

### subscription_status
- active
- cancelled
- expired
- past_due

### referral_status
- pending
- completed
- expired
- cancelled

## Row Level Security

All tables have RLS enabled with the following general patterns:

### User Data Access
- Users can only view their own data
- Profiles visible to self only
- Transactions read-only for users
- Conversations and messages restricted to owner

### Public Data
- Subscription tiers visible to all
- Active apps visible to all

### Admin Operations
- Service role key bypasses RLS
- Required for system operations
- Used for awarding points, completing referrals

## Indexes

Performance-optimized indexes on:
- Foreign keys for joins
- Timestamp columns for sorting
- Request IDs for idempotency checks
- Status fields for filtering
- Referral codes for lookups

## Triggers

### Immutability Enforcement
- `enforce_equity_immutability`: Prevents updates to equity_transactions
- `enforce_equity_no_delete`: Prevents deletes from equity_transactions

### Timestamp Management
- `update_updated_at_column`: Auto-updates updated_at timestamps

### User Lifecycle
- `on_auth_user_created`: Creates profile and awards signup bonus

## Security Considerations

1. **Immutable Ledger**: Equity transactions cannot be modified or deleted
2. **RLS Policies**: Users can only access their own data
3. **Service Role**: Admin operations require service role key
4. **Idempotency**: Request IDs prevent duplicate transactions
5. **Audit Trail**: Complete logging of all operations

## Migration to Blockchain

The schema is designed for eventual blockchain migration:

1. **Prepared Fields**: block_height, transaction_hash already in place
2. **Immutable Design**: Matches blockchain's append-only nature
3. **Merkle Proofs**: Support for cryptographic verification
4. **Event Sourcing**: Complete history for replay/migration

## Performance Optimizations

1. **Materialized Views**: Pre-calculated balances
2. **Strategic Indexes**: On frequently queried columns
3. **JSONB Fields**: For flexible metadata without schema changes
4. **Partitioning Ready**: Can partition large tables by date

## Best Practices

1. Always use `award_equity_points()` function for transactions
2. Include request_id for idempotent operations
3. Verify transaction integrity periodically
4. Refresh materialized views on schedule
5. Monitor audit_logs for suspicious activity