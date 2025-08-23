# Supabase Database Schema Design

## Architecture Philosophy

The Cosmo platform database is designed with three core principles:

### 1. Blockchain-Ready Architecture
Every financial operation is designed for eventual blockchain migration:
- **Immutable Records**: No UPDATE operations on equity_transactions
- **Cryptographic Fields**: Ready for signatures, hashes, and proofs
- **Event Sourcing**: Complete audit trail for reconstruction
- **Merkle Tree Support**: For efficient verification

### 2. Event-Driven Design
All user actions flow through a consistent pattern:
```
User Action → user_interactions → equity_transactions → audit_logs
```

This ensures:
- Complete traceability
- Idempotent operations via request_id
- Replay capability
- Analytics foundation

### 3. Balance Integrity
The equity ledger maintains mathematical consistency:
- Each transaction records balance_before and balance_after
- Database constraints ensure: balance_after = balance_before ± amount
- Integrity verification function available
- No floating point errors (using DECIMAL type)

## Key Design Decisions

### Why Immutable Transactions?
Traditional financial systems allow corrections through reversals. We chose immutability because:
1. **Blockchain Alignment**: Blockchains are append-only
2. **Audit Compliance**: Complete history preserved
3. **Trust**: Users can verify their entire history
4. **Simplicity**: No complex correction logic

To handle corrections, create a compensating transaction (debit to offset a credit).

### Why Request IDs?
Request IDs provide idempotency:
- Prevents double-spending in distributed systems
- Allows safe retries of failed operations
- Creates deterministic transaction IDs
- Essential for blockchain migration

### Why Materialized Views?
The `equity_balances` view provides:
- O(1) balance lookups instead of O(n) aggregation
- Reduced database load
- Point-in-time snapshots
- Can be refreshed asynchronously

### Why JSONB for Metadata?
JSONB fields provide:
- Schema flexibility without migrations
- Efficient indexing and querying
- Future-proofing for unknown requirements
- Native PostgreSQL optimization

## Common Operations

### Award Points to User
```sql
-- With idempotency
SELECT award_equity_points(
  'user-uuid'::uuid,
  'daily_active'::action_type,
  10.0,
  'daily_2024_01_15_user123', -- request_id
  'Daily activity bonus'
);
```

### Check User Balance
```sql
-- Fast lookup via materialized view
SELECT * FROM equity_balances WHERE user_id = 'user-uuid';

-- Real-time calculation
SELECT * FROM get_user_balance('user-uuid');
```

### Complete a Referral
```sql
-- Awards points to both referrer and referred
SELECT complete_referral('referred-user-uuid');
```

### Verify Transaction Integrity
```sql
-- Ensures balance chain is valid
SELECT verify_transaction_integrity('user-uuid');
```

## Migration Patterns

### Adding New Action Types
1. Update the `action_type` enum
2. Define point values in application logic
3. Use existing `award_equity_points` function

### Modifying Point Values
Point values are NOT stored in database - they're in application logic.
This allows:
- A/B testing different values
- Time-based promotions
- User segment variations

### Preparing for Blockchain
When ready to migrate:
1. Deploy smart contracts
2. Begin populating blockchain fields
3. Run dual-write period
4. Verify on-chain data
5. Switch reads to blockchain

## Security Patterns

### Service Role Operations
Functions marked `SECURITY DEFINER` run with elevated privileges:
- `award_equity_points`
- `complete_referral`
- `get_user_balance`

These bypass RLS but include business logic validation.

### User Operations
Direct table access is restricted by RLS:
- Users can only see their own data
- Equity transactions are read-only
- Profiles are self-editable only

### Audit Trail
Every operation is logged:
- User interactions track requests
- Audit logs track data changes
- Both include IP and user agent

## Performance Considerations

### Index Strategy
Indexes are placed on:
- Foreign keys (automatic joins)
- Lookup fields (referral_code, request_id)
- Sort fields (created_at)
- Filter fields (status, action_type)

### Query Optimization
- Use materialized view for balance lookups
- Batch operations when possible
- Avoid N+1 queries with proper joins
- Use EXPLAIN ANALYZE for slow queries

### Scaling Preparation
Ready for:
- Table partitioning by date
- Read replicas for analytics
- Async job processing
- Cache layer integration

## Testing Strategy

### Unit Tests
Test individual functions:
```sql
-- Test idempotency
SELECT award_equity_points(...);
SELECT award_equity_points(...); -- Same request_id
-- Should return same transaction_id
```

### Integration Tests
Test complete flows:
1. User signup → Profile creation → Signup bonus
2. Referral → Both users get points
3. Subscription → Multiplier applies

### Integrity Tests
Regular verification:
```sql
-- Check all users
SELECT user_id, verify_transaction_integrity(user_id) 
FROM profiles;
```

## Monitoring

### Key Metrics
Monitor:
- Transaction volume per action_type
- Failed transaction attempts
- Materialized view refresh time
- Request_id collision rate

### Alerts
Set up alerts for:
- Integrity check failures
- Unusual transaction patterns
- Failed equity awards
- RLS policy violations

## Future Enhancements

### Planned Features
1. **Vesting Schedules**: Time-locked equity
2. **Equity Pools**: Per-app point allocation
3. **Staking Mechanisms**: Lock points for benefits
4. **Governance Tokens**: Voting with equity

### Blockchain Features
1. **Smart Contract Integration**: Direct on-chain writes
2. **Cross-chain Support**: Multiple blockchain targets
3. **NFT Rewards**: Special achievements as NFTs
4. **DeFi Integration**: Liquidity pools for points

## Common Pitfalls

### Don't
- ❌ Update equity_transactions directly
- ❌ Skip request_id for important operations
- ❌ Store point values in database
- ❌ Forget to refresh materialized views
- ❌ Use floating point for money

### Do
- ✅ Use provided functions for equity operations
- ✅ Include request_id for idempotency
- ✅ Keep point logic in application
- ✅ Schedule regular view refreshes
- ✅ Use DECIMAL for financial data

## Support Queries

### Find Duplicate Transactions
```sql
SELECT request_id, COUNT(*) 
FROM user_interactions 
WHERE request_id IS NOT NULL 
GROUP BY request_id 
HAVING COUNT(*) > 1;
```

### Reconcile User Balance
```sql
SELECT 
  eb.current_balance as materialized,
  gb.total_balance as calculated,
  eb.current_balance - gb.total_balance as difference
FROM equity_balances eb
JOIN get_user_balance('user-uuid') gb ON true
WHERE eb.user_id = 'user-uuid';
```

### Transaction History
```sql
SELECT 
  et.*,
  ui.action_type,
  ui.action_metadata
FROM equity_transactions et
LEFT JOIN user_interactions ui ON et.interaction_id = ui.id
WHERE et.user_id = 'user-uuid'
ORDER BY et.created_at DESC;
```