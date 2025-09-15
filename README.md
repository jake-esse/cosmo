# Ampel AI - The AI App Store

Ampel is building the first app store for consumer AI applications where users earn equity in the apps they use. Think "App Store meets AI meets Web3" - a platform that aligns user, developer, and platform incentives through shared ownership.

## Core Features

### 🎯 User Ownership
- **100 points** - Sign up bonus
- **50 points** - For each friend you refer
- **25 points** - Bonus when you join via referral  
- **200 points/month** - Premium subscriptions

### 🚀 AI-First Platform
- Integrated Claude AI chat interface
- AI app marketplace (coming soon)
- Personalized AI recommendations
- Developer SDK for AI apps

### 🔐 Blockchain-Ready
- Immutable equity records
- Event-sourced transaction history
- Prepared for on-chain migration
- Transparent ownership tracking

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude API
- **UI**: Tailwind CSS + shadcn/ui
- **Typography**: Inter (UI) + Crimson Pro (Brand)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Anthropic API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ampel-ai/ampel-platform.git
cd ampel-platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
ANTHROPIC_API_KEY=your_claude_api_key
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
/app                    # Next.js 14 App Router pages
  /(auth)              # Authentication pages
  /(dashboard)         # Protected app pages
/components            # React components
  /ui                  # shadcn/ui components
  /layout             # Layout components
/lib                   # Core libraries
  /supabase           # Database client
  /constants          # Brand and app constants
/docs                  # Documentation
/types                 # TypeScript definitions
```

## Key Features

### Authentication
- Email/password authentication
- Email verification
- Referral system
- Automatic equity rewards

### Dashboard
- Equity wallet tracking
- Referral management
- AI chat interface
- App marketplace (coming soon)
- Data controls
- Settings

### Design System
- Custom CSS variables
- Semantic color tokens
- Responsive layouts
- Dark mode support
- Custom shadows

## Development

### Commands

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run linter
```

### Contributing

1. Check current issues and roadmap
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Documentation

- [API Documentation](./docs/api.md)
- [Architecture Overview](./docs/architecture.md)
- [Database Schema](./docs/database-schema.md)
- [Blockchain Transition](./docs/blockchain-transition.md)
- [Technical Debt](./docs/technical-debt.md)

## Roadmap

- ✅ User authentication & profiles
- ✅ Equity point system
- ✅ Referral system
- ✅ AI chat interface
- 🚧 App marketplace
- 🚧 Developer SDK
- 📋 Blockchain integration
- 📋 Mobile apps

## Support

For questions or issues:
1. Check the documentation
2. Review existing issues
3. Create a detailed bug report

## License

[TBD]

---

Built with speed and vision by the Ampel team.