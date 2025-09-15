# Ampel - AI App Store Platform

## Project Overview
Ampel is building the first app store for consumer AI applications where users earn equity in the apps they use. Think "App Store meets AI meets Web3" - a platform that aligns user, developer, and platform incentives through shared ownership.

## Core Principles

### 1. User Ownership
Users earn equity points for:
- Signing up (100 points)
- Referring friends (50 points to referrer)
- Being referred (25 points bonus on top of signup)
- Premium subscriptions (200 points/month)
- Future: Using integrated apps

### 2. Blockchain-Ready Architecture
Every financial operation is designed for eventual blockchain migration:
- **Immutable**: No UPDATE operations on equity records
- **Idempotent**: Safe to retry any operation
- **Event Sourced**: Complete audit trail
- **Cryptographically Prepared**: Fields ready for on-chain data

### 3. Developer-First Platform
Building with future SDK in mind:
- Clean API patterns
- Consistent data models
- Documented interfaces
- Extensible architecture

## Directory Structure
```
/app                    # Next.js 14 App Router
  page.tsx             # Landing page (public)
  /(auth)              # Authentication pages
  /(dashboard)         # Protected app pages
  /api                 # API routes
/components            # React components
  /ui                  # shadcn/ui components
  /landing            # Landing page components
  /chat               # Chat-specific components
  /wallet             # Equity wallet components
/lib                   # Core libraries
  /supabase           # Database client
  /anthropic          # Claude API client
  /equity             # Equity system logic
/docs                  # Documentation
/types                 # TypeScript definitions
```

## Tech Stack
- **Frontend**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude API
- **UI**: Tailwind CSS + shadcn/ui
- **Typography**: DM Sans (UI) + Crimson Text (Headlines) + Roboto Mono (Captions)
- **Deployment**: Vercel
- **Development**: Claude Code + TypeScript

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Anthropic API key

### Installation
```bash
# Clone the repository
git clone https://github.com/ampel-ai/ampel-platform.git

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
ANTHROPIC_API_KEY=your_claude_api_key
```

## Development Workflow

### For New Features
1. Check current state in Supabase
2. Write requirements in docs
3. Create Claude Code prompt
4. Review implementation
5. Update documentation

### For Bug Fixes
1. Document in technical-debt.md
2. Create focused fix
3. Test thoroughly
4. Update relevant CLAUDE.md

## Key Decisions

### Why Supabase?
- Built-in auth
- Real-time capabilities
- Edge functions
- Row Level Security
- Fast development

### Why Next.js 14?
- App Router for better performance
- Server Components default
- Built-in API routes
- Excellent DX

### Why Event Sourcing for Equity?
- Complete audit trail
- Blockchain migration ready
- Replay capability
- Immutable history

## Contributing
This is a fast-moving startup project. When contributing:
1. Prioritize shipping over perfection
2. Document your decisions
3. Keep blockchain migration in mind
4. Update relevant CLAUDE.md files
5. Track technical debt honestly

## Support
For questions or issues:
- Check /docs first
- Review component CLAUDE.md files
- Create detailed bug reports

## License
[TBD]

---
Built with speed and vision by the Ampel team.
