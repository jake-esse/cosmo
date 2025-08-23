# Architecture Documentation

## System Overview
Building an AI app store platform where users earn equity in the apps they use. Starting with a chat MVP using Claude API.

## Core Principles
1. **Immutability**: All equity transactions are append-only
2. **Idempotency**: All financial operations can be safely retried
3. **Event Sourcing**: Complete audit trail of user actions
4. **Blockchain Ready**: Designed for future on-chain migration

## Tech Stack
- **Frontend**: Next.js 14 with App Router
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **AI**: Anthropic Claude API
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel

## Database Design

### Event Sourcing Pattern
```
User Action → Event Log → Equity Transaction → Balance Update
```

### Key Tables
- `profiles`: User profiles extending auth.users
- `user_interactions`: Event log (append-only)
- `equity_transactions`: Immutable ledger
- `conversations`: Chat history
- `messages`: Individual messages
- `referrals`: Referral tracking

## API Design
[To be documented as we build]

## Security Considerations
- Row Level Security (RLS) on all tables
- API key management through environment variables
- Rate limiting on all endpoints
- Idempotent financial operations

## Future Considerations
- ERC-20 token migration path
- Multi-app data sharing
- Developer SDK architecture
