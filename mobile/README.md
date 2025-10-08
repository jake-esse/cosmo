# Ampel Mobile

React Native mobile application for the Ampel AI platform, built with Expo.

## Status

✅ **Infrastructure Complete** - Ready for feature development

The mobile workspace is fully set up with:
- ✅ Expo project initialized (SDK 54)
- ✅ TypeScript configured with strict mode
- ✅ Workspace integration with @ampel/shared
- ✅ React Navigation configured
- ✅ Supabase client configured
- ✅ Placeholder screens created
- ✅ Bottom tab navigation working

## Tech Stack

- **Framework**: React Native 0.81.4
- **Platform**: Expo SDK 54
- **Language**: TypeScript 5.9 (strict mode)
- **Navigation**: React Navigation 7
- **Backend**: Supabase (shared with web app)
- **State**: React hooks (useState, useEffect, useContext)
- **Storage**: AsyncStorage (for session persistence)
- **Shared Code**: @ampel/shared workspace

## Project Structure

```
/mobile
  /src
    /components        # React components
      /common         # Shared UI components
      /auth          # Auth-specific components
      /chat          # Chat-specific components
      /wallet        # Equity wallet components
    /screens          # Full screen components
      AuthScreen.tsx
      HomeScreen.tsx
      ChatScreen.tsx
      WalletScreen.tsx
      SettingsScreen.tsx
    /navigation       # Navigation configuration
      AppNavigator.tsx
      types.ts
    /services         # API and backend services
      supabase.ts
    /hooks            # Custom React hooks
      useAuth.ts
    /utils            # Mobile-specific utilities
    /constants        # Mobile-specific constants
      colors.ts (re-exports from @ampel/shared)
  /assets             # Images, fonts, etc.
    /images
    /fonts
  App.tsx             # Root component
  app.json            # Expo configuration
  package.json
  tsconfig.json
  babel.config.js
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm (matching workspace configuration)
- iOS Simulator (Mac only) or physical iOS device
- Android Studio with emulator OR physical Android device
- Expo Go app (for quick testing on physical devices)

### Installation

From the repository root:

```bash
# Install all workspace dependencies
npm install

# Navigate to mobile workspace (optional, for mobile-specific commands)
cd mobile
```

### Environment Variables

The mobile app uses the **shared configuration system** (`@ampel/shared/config`) which reads from the root `.env.local` file.

Create a `.env.local` file in the **root directory** (not in /mobile) with:

```env
# Supabase Configuration (required)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Also include NEXT_PUBLIC_ versions for web compatibility
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

**Important Notes:**
- **DO NOT** create a separate `mobile/.env` file - use root `.env.local` only
- Environment variables for Expo MUST use the `EXPO_PUBLIC_` prefix
- The shared config system automatically detects the platform and uses the correct prefix
- For production, use Expo EAS Secrets for environment variables

### Development

#### Start the Development Server

From the **root directory**:

```bash
# Start Metro bundler
npm run start --workspace=@ampel/mobile

# Or from /mobile directory:
npm start
```

#### Run on iOS Simulator

```bash
# From root
npm run ios --workspace=@ampel/mobile

# Or from /mobile
npm run ios
```

Requirements:
- macOS only
- Xcode installed
- iOS Simulator configured

#### Run on Android Emulator

```bash
# From root
npm run android --workspace=@ampel/mobile

# Or from /mobile
npm run android
```

Requirements:
- Android Studio installed
- Android emulator configured and running

#### Run on Physical Device

1. Install Expo Go from App Store (iOS) or Play Store (Android)
2. Start the dev server: `npm start`
3. Scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

### Development Workflow

1. **Start dev server**: `npm start` from /mobile directory
2. **Make changes**: Edit files in /src directory
3. **Hot reload**: Changes appear automatically in the app
4. **Shake device**: Open developer menu (or Cmd+D on simulator)

### Testing

```bash
# Type check (from root)
npm run typecheck --workspace=@ampel/mobile

# Type check (from /mobile)
npm run typecheck

# Lint (when configured)
npm run lint
```

### Workspace Integration

The mobile app imports shared code from `@ampel/shared`:

```typescript
// Import configuration (recommended)
import { config } from '@ampel/shared/config';

// Access environment variables
const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// Platform detection
if (config.platform.isMobile) {
  // Mobile-specific code
}

// Import types
import type { Database } from '@ampel/shared/types/supabase';

// Import constants
import { BRAND } from '@ampel/shared/constants/brand';

// Import utilities
import { formatChatName } from '@ampel/shared/utils/chatNaming';
```

TypeScript path aliases:
- `@ampel/shared/*` - Shared workspace code (including config)
- `@/*` - Mobile-specific code (./src/*)

## Current Features

### ✅ Infrastructure
- Expo project with TypeScript
- React Navigation with bottom tabs
- Supabase client with AsyncStorage
- Workspace integration tested and working

### 🚧 Coming Next Sprint
- Authentication (login/signup)
- User profile management
- Equity wallet display
- AI chat interface
- Referral system

### 📋 Future Sprints
- Push notifications
- Biometric authentication
- Offline support
- App marketplace
- Premium subscription flow

## Navigation Structure

The app uses a stack navigator that switches between:

1. **Auth Flow** (unauthenticated users)
   - AuthScreen (login/signup)

2. **Main Flow** (authenticated users)
   - Bottom tabs with 4 screens:
     - Home: Main dashboard
     - Chat: AI chat interface
     - Wallet: Equity and points
     - Settings: User preferences

Navigation is type-safe using TypeScript route params.

## Supabase Integration

The mobile app uses the standard Supabase client (not the SSR version):

```typescript
import { supabase } from '@/services/supabase';

// Auth
const { data, error } = await supabase.auth.signIn({ email, password });

// Database
const { data } = await supabase.from('users').select('*');

// Realtime
const channel = supabase.channel('changes');
```

Key differences from web:
- Uses AsyncStorage instead of cookies
- Uses createClient instead of createBrowserClient
- Session persistence handled automatically

## Styling

The app uses React Native's StyleSheet API:

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
```

Brand colors are imported from @ampel/shared:

```typescript
import { BRAND } from '@ampel/shared/constants/brand';

// Use brand colors
backgroundColor: BRAND.colors.primary
```

## Common Tasks

### Add a New Screen

1. Create screen component in `/src/screens/`
2. Add screen to navigation types in `/src/navigation/types.ts`
3. Add screen to navigator in `/src/navigation/AppNavigator.tsx`

### Add a New Component

1. Create component in appropriate `/src/components/` subdirectory
2. Use TypeScript for props
3. Export from component file

### Add Shared Code

1. Add to `/shared` workspace (not /mobile)
2. Import using `@ampel/shared/*` alias
3. Keep platform-agnostic (no React Native imports in /shared)

### Debug Issues

1. **Check Metro bundler**: Should show no errors
2. **Check TypeScript**: Run `npm run typecheck`
3. **Check Expo logs**: Look for red/yellow warnings
4. **Reset Metro cache**: `npx expo start --clear`
5. **Reinstall**: `rm -rf node_modules && npm install`

## Troubleshooting

### Module Resolution Errors

If you see "Module not found" errors:

```bash
# Clear Metro bundler cache
npx expo start --clear

# Reinstall dependencies
npm install

# Verify babel.config.js has module-resolver plugin
```

### TypeScript Errors

```bash
# Run type check to see all errors
npm run typecheck

# Verify tsconfig.json has correct paths
```

### Build Errors

```bash
# iOS: Clean build
cd ios && pod install && cd ..

# Android: Clean build
cd android && ./gradlew clean && cd ..
```

### Environment Variables Not Working

- **DO NOT** create `mobile/.env` - use root `.env.local` only
- Verify variables use `EXPO_PUBLIC_` prefix
- Restart Metro bundler after changing .env: `npx expo start --clear`
- Check variables are in root .env.local (not mobile/.env or web/.env)
- Import config from `@ampel/shared/config` instead of accessing `process.env` directly
- Check for clear error messages from the config validation system

## Deployment

Deployment will be configured using Expo EAS:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

*Detailed deployment instructions will be added when ready for production.*

## Contributing

When adding features to mobile:

1. **Check if code should be shared**: If it's platform-agnostic (types, constants, utils), add to /shared
2. **Follow TypeScript best practices**: Use strict types, no `any`
3. **Test on both platforms**: iOS and Android
4. **Update this README**: Document new features or setup steps
5. **Run typecheck**: Ensure no TypeScript errors before committing

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Support

For issues or questions:
1. Check this README
2. Check /docs in repository root
3. Review Expo documentation
4. Create a detailed issue report

---

**Next Steps**: Implement authentication flow in next sprint
