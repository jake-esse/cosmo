# Blockchain Migration Strategy

## Overview
This document outlines how we'll migrate from database-backed equity points to on-chain tokens.

## Current Design (Database)

### Blockchain-Ready Features
1. **Immutable Transactions**: No UPDATE operations allowed
2. **Event Sourcing**: Complete history for replay
3. **Unique Identifiers**: Every transaction has UUID
4. **Request IDs**: Idempotency built-in
5. **Cryptographic Fields**: Ready but nullable
   - `block_height`
   - `transaction_hash`
   - `signature`
   - `merkle_proof`

## Migration Path

### Phase 1: Database (Current)
- All equity tracked in PostgreSQL
- Immutable append-only design
- Event sourcing for audit trail

### Phase 2: Hybrid (3-6 months)
- Deploy ERC-20 smart contract
- Snapshot database balances
- Generate merkle tree for claims
- Users can claim tokens but DB remains source of truth

### Phase 3: On-Chain (6-12 months)
- All new transactions on-chain
- Database becomes read-only archive
- Smart contract is source of truth

## Smart Contract Interface
```solidity
interface ICosmoEquity {
    function claim(uint256 amount, bytes32[] proof) external;
    function transfer(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}
```

## Technical Requirements
- Maintain transaction history during migration
- Zero equity loss during transition
- Ability to verify historical transactions
- Support for gas-free transactions initially

## Risk Mitigation
- Extensive testing on testnet
- Phased rollout to users
- Ability to pause/rollback if issues
- Regular balance reconciliation
