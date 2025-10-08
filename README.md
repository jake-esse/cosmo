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

- **Architecture**: Monorepo with npm workspaces
- **Frontend (Web)**: Next.js 15 (App Router)
- **Frontend (Mobile)**: React Native with Expo (SDK 54)
- **Shared Code**: TypeScript utilities, types, and constants
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude API
- **UI**: Tailwind CSS + shadcn/ui (web), React Native StyleSheet (mobile)
- **Typography**: Inter (UI) + Crimson Pro (Brand)
- **Deployment**: Vercel (web), Expo EAS (mobile)

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

3. Set up environment variables in root `.env.local`:
```bash
# Create .env.local in the root directory (not in web/ or mobile/)
touch .env.local
```

4. Configure your environment variables in `.env.local`:
```env
# Supabase - Required for both web and mobile
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# AI API Keys - Server-side only
ANTHROPIC_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_key
GOOGLE_AI_API_KEY=your_google_ai_key
XAI_API_KEY=your_xai_key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note:** Both web and mobile read from the **same** root `.env.local` file. Do not create separate `.env` files in `web/` or `mobile/` directories.

5. Run the web development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the web application.

6. (Optional) Run the mobile development server:
```bash
npm run start --workspace=@ampel/mobile
```

See [mobile/README.md](./mobile/README.md) for detailed mobile setup instructions.

## Project Structure

```
/web                   # Next.js web application
  /app                 # Next.js 15 App Router pages
    /(auth)           # Authentication pages
    /(dashboard)      # Protected app pages
  /components         # React components
  /lib                # Web-specific libraries
/shared               # Shared code between web & mobile
  /config             # Unified environment configuration
  /types              # TypeScript type definitions
  /constants          # Brand and design constants
  /utils              # Pure utility functions
/mobile               # React Native app (Expo)
  /src                # Mobile source code
    /screens          # Mobile screens/pages
    /components       # Mobile-specific components
    /services         # API and service clients
/docs                 # Documentation
/supabase             # Database configuration
/.env.local           # Single source of truth for environment variables
```

### Configuration System

The monorepo uses a **shared configuration system** (`@ampel/shared/config`) that provides type-safe access to environment variables across both web and mobile platforms.

**Key Features:**
- Single source of truth: Root `.env.local` file
- Platform detection: Automatically uses correct env var prefixes
- Type-safe: Full TypeScript support
- Runtime validation: Clear errors for missing required variables
- Works in both Next.js and Expo environments

**Usage:**
```typescript
import { config } from '@ampel/shared/config';

// Access Supabase config
const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// Platform detection
if (config.platform.isWeb) {
  // Web-specific code
}

if (config.platform.isMobile) {
  // Mobile-specific code
}
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
# Web app
npm run dev        # Start web development server (shortcut)
npm run dev:web    # Start web development server
npm run build      # Build web app for production
npm run start      # Start web production server

# Mobile app
npm run start --workspace=@ampel/mobile    # Start Expo dev server
npm run ios --workspace=@ampel/mobile      # Run on iOS simulator
npm run android --workspace=@ampel/mobile  # Run on Android emulator

# Workspace operations
npm run typecheck  # Type check all workspaces
npm run lint       # Lint all workspaces
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
- ✅ Monorepo architecture (web/mobile/shared)
- ✅ Mobile app infrastructure (React Native with Expo)
- 🚧 Mobile authentication flow
- 🚧 App marketplace
- 🚧 Developer SDK
- 📋 Blockchain integration

## Support

For questions or issues:
1. Check the documentation
2. Review existing issues
3. Create a detailed bug report

## License

[TBD]

---

Built with speed and vision by the Ampel team.