# AMPEL MOBILE APP - DEVELOPMENT PLAN v2.0

## EXECUTIVE SUMMARY
**Status**: Ready to begin Phase 1 development
**Timeline**: 6 weeks to feature parity with web
**Architecture**: Native React Native with maximum code sharing via /shared
**Approach**: Feature-by-feature translation, not redesign
**Risk Level**: Low - proven architecture, clear requirements

**Key Decisions Made:**
✅ React Navigation with drawer architecture (AI chat app standard)
✅ Zustand for global state (minimal, only where needed)
✅ Same Supabase backend, mobile-optimized client
✅ Native biometric auth via expo-local-authentication
✅ Platform-specific UX (iOS/Android best practices)
✅ **Apps marketplace included at launch with Ampel app page**
✅ **Profile consolidates Settings and Referrals as sub-screens**

---

## MOBILE ARCHITECTURE DESIGN

### Navigation Structure
```
RootNavigator (Stack)
├── AuthNavigator (Stack) - Unauthenticated flows
│   ├── Welcome
│   ├── Login
│   ├── Signup
│   └── ForgotPassword
│
└── MainNavigator (Drawer) - Authenticated app
    ├── ChatStack (Stack) - DEFAULT
    │   ├── ConversationsList
    │   ├── ChatScreen
    │   └── NewConversation (Modal)
    │
    ├── AppsStack (Stack) - NEW: Required at launch
    │   ├── AppsMarketplace
    │   └── AppDetail
    │
    ├── WalletStack (Stack)
    │   ├── WalletOverview
    │   ├── TransactionHistory
    │   └── TransactionDetail (Modal)
    │
    └── ProfileStack (Stack)
        ├── Profile (Hub)
        ├── Settings (From Profile)
        ├── ReferralCenter (From Profile)
        └── DataControls (From Settings)
```

### Drawer Configuration
**4 Main Items:**
1. 💬 **Conversations** (Chat) - Default screen
2. 🎯 **Apps** (Marketplace) - Required at launch
3. 💰 **Wallet** (Equity)
4. 👤 **Profile** (with Settings & Referrals nested)

---

## STATE MANAGEMENT STRATEGY

### Global State (Zustand):
- Auth state (user, session)
- Current conversation
- Equity balance (cached)
- App settings (theme, biometrics)

### Local State (React hooks):
- Form inputs
- UI toggles
- Loading states
- Modal visibility

### Server State (React Query):
- Conversations list
- Messages
- Transaction history
- Profile data
- **Apps marketplace data**

---

## API LAYER ARCHITECTURE

```
/services
├── api/
│   ├── supabase.ts          // Mobile Supabase client
│   ├── auth.ts              // Auth operations
│   ├── chat.ts              // Chat/Claude integration
│   ├── equity.ts            // Equity operations
│   ├── profile.ts           // Profile operations
│   └── apps.ts              // Apps marketplace (NEW)
├── storage/
│   ├── secure.ts            // expo-secure-store wrapper
│   └── async.ts             // AsyncStorage wrapper
└── platform/
    ├── biometrics.ts        // Biometric auth
    ├── notifications.ts     // Push notifications
    └── sharing.ts           // Native share sheet
```

---

## COMPONENT ARCHITECTURE

```
/components
├── ui/                      // Design system components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   └── Typography.tsx
├── chat/
│   ├── MessageBubble.tsx
│   ├── ChatInput.tsx
│   ├── ConversationItem.tsx
│   └── TypingIndicator.tsx
├── wallet/
│   ├── BalanceCard.tsx
│   ├── TransactionItem.tsx
│   └── ReferralCode.tsx
├── apps/                    // NEW
│   ├── AppCard.tsx
│   ├── AppHeader.tsx
│   └── FeatureList.tsx
├── common/
│   ├── LoadingState.tsx
│   ├── ErrorState.tsx
│   ├── EmptyState.tsx
│   └── PullToRefresh.tsx
└── layout/
    ├── ScreenContainer.tsx
    ├── KeyboardAvoidingWrapper.tsx
    └── SafeAreaWrapper.tsx
```

---

## FEATURE MAPPING: WEB TO MOBILE

### ✅ Direct Translation (90% code sharing)

| Feature | Web Implementation | Mobile Implementation | Complexity | Shared Code |
|---------|-------------------|----------------------|------------|-------------|
| Auth Logic | Supabase + hooks | Same + biometrics | Low | 95% (from /shared) |
| Equity Calculations | Event sourcing | Same logic | Low | 100% (from /shared) |
| Referral System | Code generation | Same + deep links | Low | 90% (from /shared) |
| Chat Message Handling | Claude API + SSE | Same implementation | Low | 85% (API calls shared) |
| Token Counting | tiktoken | Same library | Low | 100% (from /shared) |
| Transaction History | Supabase queries | Same queries | Low | 100% (from /shared) |
| **Apps Data** | **Supabase queries** | **Same queries** | **Low** | **100% (from /shared)** |

### 🔄 Mobile-Adapted Features

| Feature | Web Version | Mobile Version | Changes Needed | Time |
|---------|------------|----------------|----------------|------|
| Login UI | Form page | Form screen + biometrics | Add biometric option | 2h |
| Chat Interface | Desktop layout | Mobile-optimized layout | Responsive design | 4h |
| Conversation List | Sidebar | Full screen list | Navigation change | 2h |
| Wallet Display | Dashboard card | Full screen card | Layout adaptation | 2h |
| Referral Sharing | Copy button | Native share sheet | Platform API | 1h |
| Settings | Form page | Native toggles | Platform components | 3h |
| **Apps Marketplace** | **Grid layout** | **Mobile grid/list** | **Touch optimization** | **4h** |
| **App Detail** | **Full page** | **Mobile screen** | **Layout adaptation** | **3h** |

### ⚡ Mobile-Enhanced Features

| Feature | Enhancement | Benefit | Complexity | Time |
|---------|------------|---------|------------|------|
| Biometric Auth | Face ID/Touch ID | Better UX than passwords | Medium | 3h |
| Push Notifications | Message responses | Engagement driver | Medium | 4h |
| Haptic Feedback | On actions | Native feel | Low | 1h |
| Deep Linking | Referral codes | Better sharing | Medium | 3h |
| Offline Caching | Read conversations | Works offline | Medium | 4h |
| Pull-to-Refresh | Update data | Better mobile UX | Low | 2h |

### 🚫 Not Needed for MVP

| Web Feature | Why Excluded | Post-Launch Priority |
|-------------|-------------|---------------------|
| Landing page | Mobile is app-only | N/A |
| Email verification flow | Handled in app | Week 7 |
| Admin panel | Web-only feature | N/A |
| Premium subscriptions UI | Future feature | Week 10 |

---

## 6-WEEK DEVELOPMENT ROADMAP

### WEEK 1: Foundation & Authentication (Days 1-7)
**Goal**: Working authenticated app shell

**Deliverables:**
- App launches with navigation
- User can sign up/login
- Session persistence works
- Biometric auth functional

**Daily Breakdown:**
- Day 1-2: Project setup, dependencies, folder structure
- Day 3-4: Auth screens UI + Supabase integration
- Day 5-6: Auth flow + session management + biometrics
- Day 7: Testing + polish

---

### WEEK 2: Chat Interface (Days 8-14)
**Goal**: Full working chat with Claude API

**Deliverables:**
- Conversation list screen
- Chat screen with messages
- Send/receive messages
- Streaming responses
- Conversation management

**Daily Breakdown:**
- Day 8-9: Chat UI components (bubbles, input)
- Day 10-11: Claude API integration + streaming
- Day 12-13: Conversation CRUD + navigation
- Day 14: Polish + keyboard handling

---

### WEEK 3: Equity System (Days 15-21)
**Goal**: Complete wallet with equity tracking

**Deliverables:**
- Wallet overview screen
- Transaction history
- Equity tracking
- Real-time updates

**Daily Breakdown:**
- Day 15-16: Equity service layer from /shared
- Day 17-18: Wallet screens + transaction history
- Day 19-20: Performance + caching
- Day 21: Polish + edge cases

---

### WEEK 4: Apps Marketplace (Days 22-28)
**Goal**: Apps marketplace with Ampel app page

**Deliverables:**
- Apps marketplace screen
- App detail page (Ampel)
- Content matching web exactly
- Navigation working

**Daily Breakdown:**
- Day 22-23: Apps service + data layer
- Day 24-25: Marketplace UI + grid layout
- Day 26-27: App detail page (Ampel content)
- Day 28: Polish + testing

---

### WEEK 5: Profile & Settings (Days 29-35)
**Goal**: Complete user profile with nested screens

**Deliverables:**
- Profile hub screen
- Settings screen (nested)
- Referral center (nested)
- Data management
- Account actions

**Daily Breakdown:**
- Day 29-30: Profile hub + navigation
- Day 31-32: Settings screen + preferences
- Day 33-34: Referral center + sharing
- Day 35: Data controls + polish

---

### WEEK 6: Testing & Launch Prep (Days 36-42)
**Goal**: Production-ready app

**Deliverables:**
- Platform-specific polish (iOS/Android)
- Performance optimization
- End-to-end testing complete
- Beta testing feedback incorporated
- App Store assets ready
- Submission complete

**Daily Breakdown:**
- Day 36-37: iOS/Android polish
- Day 38-39: Performance optimization
- Day 40-41: E2E testing + bug fixes
- Day 42: Store submission prep

---

## CLAUDE CODE PROMPTS (12 SPRINTS)

### SPRINT 1: Project Foundation (Days 1-2)

**CONTEXT:**
We're building a React Native mobile app for Ampel, an AI app store platform where users earn equity. We've already set up a monorepo with /web, /mobile, and /shared workspaces. The mobile workspace has been initialized with Expo but needs core dependencies and folder structure.

**OBJECTIVE:**
Install all necessary dependencies and create the complete folder structure for the mobile app.

**REQUIREMENTS:**
- Install all dependencies listed in tech stack
- Create complete folder structure following React Native best practices
- Set up TypeScript configuration with strict mode
- Configure path aliases (@components, @screens, @services, etc.)
- Set up environment variables structure
- Create app.json with proper configuration
- Set up EAS Build configuration

**TECHNICAL SPECIFICATIONS:**
- Framework: Expo SDK 52+, React Native 0.76+
- Navigation: @react-navigation/native, @react-navigation/drawer, @react-navigation/stack
- State Management: zustand
- Backend: @supabase/supabase-js
- Styling: nativewind (Tailwind for RN)
- Icons: @expo/vector-icons
- Platform: expo-local-authentication, expo-secure-store, expo-sharing, expo-haptics
- Form: react-hook-form, zod
- Location: /mobile directory
- Configuration: Use strict TypeScript, enable all recommended Expo plugins

**FOLDER STRUCTURE TO CREATE:**
```
/mobile
├── app/                    # Expo Router or screens
├── components/
│   ├── ui/                # Design system
│   ├── chat/              # Chat components
│   ├── wallet/            # Wallet components
│   ├── apps/              # Apps marketplace components (NEW)
│   ├── common/            # Shared components
│   └── layout/            # Layout wrappers
├── screens/
│   ├── auth/              # Auth screens
│   ├── chat/              # Chat screens
│   ├── wallet/            # Wallet screens
│   ├── apps/              # Apps marketplace screens (NEW)
│   └── profile/           # Profile screens
├── services/
│   ├── api/               # API calls
│   ├── storage/           # Storage utilities
│   └── platform/          # Platform-specific
├── hooks/                 # Custom hooks
├── store/                 # Zustand stores
├── navigation/            # Navigation config
├── constants/             # Constants
├── utils/                 # Utilities
├── types/                 # TypeScript types
└── assets/                # Images, fonts, etc.
```

**EXPECTED OUTPUT:**
- All dependencies installed
- Complete folder structure created
- TypeScript configured properly
- app.json configured with correct metadata
- eas.json created for builds
- .env.example file created
- All files compile without errors

**VALIDATION CHECKLIST:**
□ npm install completes successfully
□ TypeScript has no configuration errors
□ Path aliases work (@components/ui/Button imports correctly)
□ Expo app can be started with npx expo start
□ @ampel/shared workspace can be imported

---

### SPRINT 2: Auth Foundation (Days 3-4)

**CONTEXT:**
Mobile app foundation is set up. Now we need to implement the authentication layer using Supabase Auth. The web app uses email/password auth with Supabase. Mobile will add biometric auth on top of this.

**OBJECTIVE:**
Create the Supabase client, auth service layer, and auth context provider for the mobile app.

**REQUIREMENTS:**
- Create mobile Supabase client configuration
- Implement auth service with login, signup, logout, session management
- Create auth context provider using React Context
- Set up secure session storage using expo-secure-store
- Implement biometric auth setup (Face ID/Touch ID)
- Create auth hook (useAuth) for components
- Handle auth state persistence across app restarts
- Implement proper error handling for auth operations

**TECHNICAL SPECIFICATIONS:**
- File Location: /mobile/services/api/supabase.ts, /mobile/services/api/auth.ts
- Storage: expo-secure-store for tokens
- Biometrics: expo-local-authentication
- Context: /mobile/contexts/AuthContext.tsx
- Hook: /mobile/hooks/useAuth.ts
- Use same Supabase credentials as web app
- Store session securely, never in AsyncStorage
- Support biometric unlock after initial login

**AUTH SERVICE METHODS:**
```typescript
// Required methods
signUp(email, password, referralCode?)
signIn(email, password)
signInWithBiometrics()
signOut()
resetPassword(email)
getCurrentUser()
getSession()
setupBiometrics()
isBiometricAvailable()
```

**AUTH CONTEXT STATE:**
```typescript
{
  user: User | null
  session: Session | null
  loading: boolean
  biometricsEnabled: boolean
  signIn: (email, password) => Promise<void>
  signUp: (email, password, referralCode?) => Promise<void>
  signOut: () => Promise<void>
  enableBiometrics: () => Promise<void>
  disableBiometrics: () => Promise<void>
}
```

**EXPECTED OUTPUT:**
- /services/api/supabase.ts - Mobile Supabase client
- /services/api/auth.ts - Auth service with all methods
- /services/storage/secure.ts - Secure storage wrapper
- /services/platform/biometrics.ts - Biometrics utility
- /contexts/AuthContext.tsx - Auth context provider
- /hooks/useAuth.ts - Auth hook
- All files properly typed with TypeScript
- Error handling for network issues, invalid credentials, etc.

**VALIDATION CHECKLIST:**
□ Can sign up new user
□ Can sign in existing user
□ Session persists after app restart
□ Can sign out
□ Biometric setup works (if available)
□ Biometric unlock works (if enabled)
□ Proper error messages shown
□ All TypeScript types correct

---

### SPRINT 3: Auth UI Screens (Days 5-6)

**CONTEXT:**
Auth service layer is complete. Now we need to build the UI screens for authentication with a native mobile feel.

**OBJECTIVE:**
Create auth screens (Welcome, Login, Signup, Forgot Password) with proper navigation, form validation, and biometric prompts.

**REQUIREMENTS:**
- Create Welcome screen with brand and CTAs
- Create Login screen with email/password + biometric option
- Create Signup screen with email/password + referral code
- Create Forgot Password screen
- Implement form validation using react-hook-form + zod
- Add loading states during API calls
- Show error messages appropriately
- Implement proper keyboard handling
- Add "Sign in with Apple" placeholder (future)
- Add "Sign in with Google" placeholder (future)
- Create navigation between auth screens

**TECHNICAL SPECIFICATIONS:**
- Location: /screens/auth/
- Navigation: Stack navigator for auth flow
- Form: react-hook-form with zod validation
- Styling: NativeWind (Tailwind for RN)
- Components: Reusable Button, Input, ErrorText components
- Platform: KeyboardAvoidingView, SafeAreaView
- Brand: Use Ampel colors and typography

**SCREENS TO CREATE:**
1. WelcomeScreen.tsx - Brand introduction + Sign Up / Login CTAs
2. LoginScreen.tsx - Email/password form + biometric button (if enabled)
3. SignupScreen.tsx - Email/password/confirm + referral code + terms checkbox
4. ForgotPasswordScreen.tsx - Email input + reset instructions

**FORM VALIDATION RULES:**
- Email: Valid email format required
- Password: Min 8 characters, at least one number
- Confirm Password: Must match password
- Referral Code: Optional, 8 alphanumeric characters

**UI REQUIREMENTS:**
- Native look and feel (iOS/Android specific)
- Proper keyboard dismissal on tap outside
- Show/hide password toggle
- Loading spinner on button during submission
- Error messages below inputs (not alerts)
- Success feedback (haptic + message)
- Smooth transitions between screens

**EXPECTED OUTPUT:**
- /screens/auth/WelcomeScreen.tsx
- /screens/auth/LoginScreen.tsx
- /screens/auth/SignupScreen.tsx
- /screens/auth/ForgotPasswordScreen.tsx
- /components/ui/Button.tsx
- /components/ui/Input.tsx
- /components/ui/ErrorText.tsx
- /navigation/AuthNavigator.tsx
- All screens functional with real auth
- Forms validate properly
- Keyboard handling works perfectly

**VALIDATION CHECKLIST:**
□ Welcome screen shows brand properly
□ Can navigate between auth screens
□ Login form validates correctly
□ Signup form validates correctly
□ Referral code is captured (if provided)
□ Biometric option shows (if available & enabled)
□ Loading states work during auth
□ Error messages display appropriately
□ Keyboard dismisses properly
□ Success feedback on signup/login

---

### SPRINT 4: Root Navigation with Drawer (Day 7)

**CONTEXT:**
Auth screens are complete. Now we need to wire up the root navigation that switches between authenticated and unauthenticated states, and create the main app shell with drawer navigation (standard for AI chat apps). The app needs 4 main sections: Chat (default), Apps marketplace (required at launch), Wallet, and Profile (with Settings and Referrals nested inside).

**OBJECTIVE:**
Create the RootNavigator that handles auth state, implement MainNavigator with drawer, and create placeholder screens for all main sections including the Apps marketplace.

**REQUIREMENTS:**
- Create RootNavigator that switches between Auth and Main based on auth state
- Implement MainNavigator with drawer navigation (left side)
- Create placeholder screen components for each drawer section
- Set up stack navigators for each section
- Configure drawer menu items with icons and labels
- Chat screen as default (opens first)
- **Include Apps marketplace as a main drawer item**
- Profile contains Settings and Referrals as nested screens (not drawer items)
- Implement deep linking structure
- Add splash screen handling
- Ensure smooth transitions
- Add hamburger menu button in headers

**TECHNICAL SPECIFICATIONS:**
- Location: /navigation/
- Navigation: React Navigation 7 + Drawer Navigator
- Auth Check: Use useAuth hook from AuthContext
- Deep Linking: Configure URL schemes
- Icons: @expo/vector-icons (Feather icon set)
- **Drawer Items: 4 items (Chat, Apps, Wallet, Profile)**
- Default Screen: ConversationsScreen (Chat)
- Profile Sub-screens: Settings, Referral Center (accessed from Profile)

**NAVIGATION STRUCTURE:**
```typescript
RootNavigator (Stack)
├── Splash (optional)
├── AuthNavigator (if !authenticated)
│   └── [Auth screens from Sprint 3]
└── MainNavigator (if authenticated)
    └── DrawerNavigator
        ├── ChatStack (Default)
        │   ├── ConversationsScreen (placeholder)
        │   └── ChatScreen (placeholder)
        │
        ├── AppsStack (NEW - Required)
        │   ├── AppsMarketplaceScreen (placeholder)
        │   └── AppDetailScreen (placeholder)
        │
        ├── WalletStack
        │   └── WalletScreen (placeholder)
        │
        └── ProfileStack
            ├── ProfileScreen (placeholder - hub)
            ├── SettingsScreen (placeholder - from profile)
            └── ReferralScreen (placeholder - from profile)
```

**DRAWER CONFIGURATION:**
```typescript
Drawer Items (in order):
1. Chat: MessageSquare icon, "Conversations"
2. Apps: Grid icon, "Apps"  // NEW
3. Wallet: Wallet icon, "Wallet"
4. Profile: User icon, "Profile"

Drawer Styling:
- User info at top (avatar, name, equity balance)
- Divider after user info
- Menu items with icons
- Active item highlighted
- Logout button at bottom (red text)
```

**DEEP LINKING:**
```
ampel://auth/login
ampel://auth/signup?ref={code}
ampel://chat
ampel://chat/{conversationId}
ampel://apps                    // NEW
ampel://apps/{appId}            // NEW
ampel://wallet
ampel://profile
ampel://profile/settings        // Nested under profile
ampel://profile/referrals       // Nested under profile
```

**HEADER CONFIGURATION:**
```typescript
All screens need:
- Left: Hamburger menu button (opens drawer)
- Center: Screen title
- Right: Screen-specific actions (if any)

ChatScreen specific:
- Right: New conversation button (+)

ProfileScreen specific:
- Shows navigation to Settings and Referrals
```

**PLACEHOLDER SCREENS:**

Create simple placeholder screens:

1. **ConversationsScreen**: 
   - "Conversations List" 
   - "Coming in next sprint"
   - Center content

2. **AppsMarketplaceScreen**: (NEW)
   - "Apps Marketplace"
   - "Coming soon - Week 4"
   - Center content

3. **AppDetailScreen**: (NEW)
   - "App Detail"
   - "Coming soon - Week 4"
   - Center content

4. **WalletScreen**:
   - "Wallet Overview"
   - "Coming soon"
   - Center content

5. **ProfileScreen** (Hub):
   - "Profile" header
   - Button: "Settings" → navigates to SettingsScreen
   - Button: "Referral Center" → navigates to ReferralScreen
   - "Logout" button
   - Center content

6. **SettingsScreen** (Nested):
   - "Settings" header
   - Back button to Profile
   - "Coming soon - Week 5"
   - Center content

7. **ReferralScreen** (Nested):
   - "Referrals" header
   - Back button to Profile
   - "Coming soon - Week 5"
   - Center content

Each placeholder should:
- Use SafeAreaView
- Show screen name as heading
- Show subtitle/status
- Center content
- Use NativeWind/Tailwind styling

**CUSTOM DRAWER CONTENT:**
Create DrawerContent.tsx that:
- Uses DrawerContentScrollView
- Shows user avatar (placeholder icon for now)
- Shows display name (from auth context)
- Shows equity balance (hardcoded "100 points" for now)
- Renders DrawerItemList for menu items (4 items: Chat, Apps, Wallet, Profile)
- Adds logout button at bottom with confirmation alert

**AUTH STATE HANDLING:**
- RootNavigator checks auth state from useAuth hook
- If user exists → show MainNavigator (drawer)
- If no user → show AuthNavigator
- Handle loading state (splash screen or loading indicator)
- No flash of wrong screen

**FILES TO CREATE:**
```
/navigation
├── RootNavigator.tsx          # Root stack with auth check
├── MainNavigator.tsx           # Drawer navigator
├── DrawerContent.tsx           # Custom drawer UI
├── types.ts                    # Navigation type definitions
└── linking.ts                  # Deep link configuration

/screens/chat
└── ConversationsScreen.tsx     # Placeholder

/screens/apps                   # NEW
├── AppsMarketplaceScreen.tsx   # Placeholder
└── AppDetailScreen.tsx         # Placeholder

/screens/wallet
└── WalletScreen.tsx            # Placeholder

/screens/profile
├── ProfileScreen.tsx           # Placeholder - Hub with navigation
├── SettingsScreen.tsx          # Placeholder - Nested under profile
└── ReferralScreen.tsx          # Placeholder - Nested under profile
```

**EXPECTED OUTPUT:**
- All navigation files created and properly typed
- Drawer opens/closes smoothly
- Hamburger button appears in all headers
- Clicking drawer items navigates correctly
- Chat screen shows first (default)
- **Apps drawer item visible and functional**
- **Profile shows buttons to Settings and Referrals**
- Settings and Referrals accessible only from Profile (not drawer)
- Logout works (clears auth, navigates to login)
- Deep linking configured for all routes
- All placeholder screens render
- No TypeScript errors
- App compiles and runs

**VALIDATION CHECKLIST:**
□ App opens to chat when logged in
□ Hamburger menu button visible
□ Drawer opens with swipe from left
□ Drawer opens with hamburger button
□ User info shows at top of drawer
□ **4 drawer items visible: Chat, Apps, Wallet, Profile**
□ Clicking items navigates correctly
□ Active item is highlighted
□ **Apps marketplace screen accessible**
□ **Profile screen shows Settings and Referrals buttons**
□ **Settings screen accessible from Profile (not drawer)**
□ **Referrals screen accessible from Profile (not drawer)**
□ Logout button visible at bottom of drawer
□ Logout shows confirmation alert
□ Logout clears session and shows auth screens
□ Back button closes drawer (Android)
□ Deep links work (test ampel://apps, ampel://profile/settings)
□ Navigation stack correct (can go back properly)

---

### SPRINT 5: Chat UI Components (Days 8-9)

**CONTEXT:**
App navigation is complete. Now we build the chat interface, starting with reusable UI components for messages.

**OBJECTIVE:**
Create all chat UI components: message bubbles, chat input, conversation list items, loading states, and typing indicators.

**REQUIREMENTS:**
- Create MessageBubble component (user and assistant variants)
- Create ChatInput component with multi-line support
- Create ConversationItem component for list
- Create TypingIndicator component
- Create LoadingState component
- Create EmptyState component
- All components should be reusable and well-typed
- Support for markdown rendering in messages
- Message timestamps
- Copy message functionality
- Proper keyboard handling

**TECHNICAL SPECIFICATIONS:**
- Location: /components/chat/
- Styling: NativeWind (Tailwind)
- Markdown: react-native-markdown-display
- Animations: react-native-reanimated
- Clipboard: @react-native-clipboard/clipboard
- Haptics: expo-haptics

**COMPONENTS TO CREATE:**

1. **MessageBubble.tsx**
```typescript
interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  tokensUsed?: number
  onCopy?: () => void
}
```

2. **ChatInput.tsx**
```typescript
interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
}
```

3. **ConversationItem.tsx**
```typescript
interface ConversationItemProps {
  id: string
  title: string
  lastMessage?: string
  lastMessageAt?: Date
  onPress: () => void
  onDelete?: () => void
}
```

4. **TypingIndicator.tsx**
5. **LoadingState.tsx**
6. **EmptyState.tsx**

**DESIGN REQUIREMENTS:**
- User messages: Right-aligned, blue background
- Assistant messages: Left-aligned, gray background
- Markdown: Proper formatting (bold, italic, code blocks)
- Timestamps: Small, gray, below message
- Swipe gestures: Swipe left on conversation to delete
- Haptic feedback: On long press to copy
- Loading: Animated dots
- Empty state: Friendly illustration + CTA

**EXPECTED OUTPUT:**
- /components/chat/MessageBubble.tsx
- /components/chat/ChatInput.tsx
- /components/chat/ConversationItem.tsx
- /components/chat/TypingIndicator.tsx
- /components/common/LoadingState.tsx
- /components/common/EmptyState.tsx
- All components render properly
- Animations smooth
- Keyboard handling perfect

**VALIDATION CHECKLIST:**
□ Message bubbles render correctly (user vs assistant)
□ Markdown renders properly in messages
□ Chat input expands with multi-line text
□ Chat input sends message on press
□ Conversation items render with correct data
□ Swipe-to-delete works on conversations
□ Long press to copy message works
□ Typing indicator animates
□ Loading state shows during data fetch
□ Empty state shows when no data

---

### SPRINT 6: Chat Screen & Claude Integration (Days 10-11)

**CONTEXT:**
Chat UI components are ready. Now we integrate with Claude API, implement message streaming, and build the complete chat screen.

**OBJECTIVE:**
Create the chat screen with full conversation functionality, integrate Claude API for streaming responses, and handle all chat-related operations.

**REQUIREMENTS:**
- Build ChatScreen that displays messages for a conversation
- Integrate Claude API for message streaming
- Implement message sending with optimistic updates
- Handle streaming responses (SSE)
- Save messages to Supabase
- Track token usage
- Implement auto-scroll to latest message
- Add pull-to-refresh
- Handle errors gracefully
- Implement message retry on failure

**TECHNICAL SPECIFICATIONS:**
- Location: /screens/chat/ChatScreen.tsx, /services/api/chat.ts
- API: Use same Claude integration as web
- Streaming: Server-Sent Events via fetch
- Database: Save messages to Supabase messages table
- Token Tracking: Use tiktoken for counting
- Shared Code: Import chat utilities from @ampel/shared
- Auto-scroll: FlatList ref with scrollToEnd

**CHAT SERVICE METHODS:**
```typescript
sendMessage(conversationId, message) => Promise<void>
streamResponse(conversationId, messages) => AsyncGenerator<string>
saveMessage(conversationId, role, content, tokens) => Promise<Message>
getMessages(conversationId) => Promise<Message[]>
```

**CHAT SCREEN FEATURES:**
- FlatList of MessageBubble components (inverted)
- ChatInput at bottom with KeyboardAvoidingView
- TypingIndicator when streaming
- Auto-scroll to bottom on new message
- Pull-to-refresh to reload messages
- Loading state on initial load
- Error handling with retry button
- Optimistic UI updates

**MESSAGE FLOW:**
1. User types message and presses send
2. Message immediately added to UI (optimistic)
3. Message sent to Claude API
4. Stream response chunks and update UI
5. Save both messages to Supabase
6. Update token counts
7. Scroll to bottom

**ERROR HANDLING:**
- Network errors: Show retry button
- API errors: Show error message
- Rate limits: Show friendly message
- Token limits: Warn user

**EXPECTED OUTPUT:**
- /screens/chat/ChatScreen.tsx
- /services/api/chat.ts
- Messages display correctly
- Streaming responses work
- Auto-scroll works
- Pull-to-refresh works
- Errors handled gracefully
- Token usage tracked

**VALIDATION CHECKLIST:**
□ Can send messages
□ Streaming responses display in real-time
□ Messages save to database
□ Auto-scroll works on new messages
□ Pull-to-refresh loads messages
□ Keyboard handling works perfectly
□ Optimistic updates work
□ Errors show with retry option
□ Token usage displays
□ Works offline (shows cached messages)

---

### SPRINT 7: Conversations Management (Days 12-13)

**CONTEXT:**
Single chat screen works perfectly. Now we need the conversations list, ability to create new conversations, and conversation management (rename, delete, archive).

**OBJECTIVE:**
Build the conversations list screen, implement conversation CRUD operations, and add navigation between conversations.

**REQUIREMENTS:**
- Build ConversationsScreen with list of conversations
- Implement create new conversation
- Implement conversation deletion
- Implement conversation archiving
- Add conversation title auto-generation
- Add search/filter conversations
- Implement pull-to-refresh
- Add swipe actions (delete, archive)
- Handle empty state
- Smooth navigation to chat screen

**TECHNICAL SPECIFICATIONS:**
- Location: /screens/chat/ConversationsScreen.tsx
- Service: /services/api/conversations.ts
- Database: Supabase conversations table
- Navigation: Pass conversationId to ChatScreen
- Search: Filter conversations by title/last message
- Swipe: react-native-swipeable or similar

**CONVERSATION SERVICE METHODS:**
```typescript
getConversations(userId, includeArchived?) => Promise<Conversation[]>
createConversation(userId, title?) => Promise<Conversation>
deleteConversation(conversationId) => Promise<void>
archiveConversation(conversationId) => Promise<void>
updateConversationTitle(conversationId, title) => Promise<void>
generateTitle(messages) => string
```

**CONVERSATIONS SCREEN FEATURES:**
- FlatList of ConversationItem components
- "+ New Chat" button (floating action button)
- Search bar at top (collapsible)
- Pull-to-refresh
- Swipe left to delete/archive
- Empty state when no conversations
- Loading state on fetch
- Archived toggle (show/hide archived)

**CONVERSATION AUTO-TITLE:**
- Generate title from first message
- Format: First 50 characters of user's first message
- Update title after first exchange
- Allow manual rename

**NEW CONVERSATION FLOW:**
1. User taps "+ New Chat" button
2. Create new conversation in database
3. Navigate to ChatScreen with conversationId
4. User sends first message
5. Title auto-generated after AI responds

**EXPECTED OUTPUT:**
- /screens/chat/ConversationsScreen.tsx
- /services/api/conversations.ts
- List of conversations displays
- Can create new conversation
- Can delete conversation (with confirmation)
- Can archive/unarchive conversation
- Search/filter works
- Navigation to chat works
- Empty state shows appropriately

**VALIDATION CHECKLIST:**
□ Conversations list loads
□ Can create new conversation
□ New conversation navigates to chat
□ Swipe to delete works (with confirmation)
□ Swipe to archive works
□ Archived conversations can be toggled
□ Search/filter works
□ Pull-to-refresh works
□ Empty state shows when no conversations
□ Title auto-generates properly

---

### SPRINT 8: Equity Service & Wallet Data (Days 15-16)

**CONTEXT:**
Chat is fully functional. Now we build the equity/wallet system. The equity logic exists in /shared, but we need mobile-specific services and UI.

**OBJECTIVE:**
Create equity service layer that leverages /shared logic, implement wallet data fetching, and prepare for wallet UI.

**REQUIREMENTS:**
- Create equity service using logic from @ampel/shared
- Implement transaction history fetching
- Implement balance calculation
- Add real-time balance updates
- Create equity tracking for user actions
- Implement referral code generation and validation
- Set up React Query for equity data
- Add equity points animation utilities

**TECHNICAL SPECIFICATIONS:**
- Location: /services/api/equity.ts
- Shared Logic: Import from @ampel/shared/equity
- Database: Supabase equity_transactions, user_interactions
- Real-time: Supabase realtime subscriptions
- State: React Query for server state
- Animations: react-native-reanimated for point animations

**EQUITY SERVICE METHODS:**
```typescript
getUserBalance(userId) => Promise<number>
getTransactions(userId, pagination) => Promise<Transaction[]>
getReferralCode(userId) => Promise<string>
validateReferralCode(code) => Promise<boolean>
trackInteraction(userId, action, metadata) => Promise<void>
subscribeToBalance(userId, callback) => Unsubscribe
```

**SHARED CODE USAGE:**
- Import equity calculation logic from @ampel/shared/lib/equity
- Use transaction type constants from @ampel/shared/constants
- Use equity points config from @ampel/shared/constants
- Leverage idempotent transaction functions

**REACT QUERY SETUP:**
```typescript
useBalance(userId)
useTransactions(userId, { page, limit })
useReferralCode(userId)
```

**EQUITY POINTS CONFIG (from shared):**
- Signup: 100 points
- Referral completed: 50 points (referrer)
- Referred signup: 25 points (referee)
- Daily active: 10 points
- Chat message: 1 point (max 100/day)
- Subscription: 200 points/month

**REAL-TIME UPDATES:**
- Subscribe to equity_transactions table
- Update balance in real-time
- Show notification when points earned
- Haptic feedback on point earning

**EXPECTED OUTPUT:**
- /services/api/equity.ts
- /hooks/useBalance.ts
- /hooks/useTransactions.ts
- /hooks/useReferralCode.ts
- Can fetch user balance
- Can fetch transaction history
- Can get referral code
- Real-time balance updates work
- React Query caching works

**VALIDATION CHECKLIST:**
□ Can fetch current balance
□ Balance matches database calculation
□ Can fetch transaction history with pagination
□ Transactions display correctly
□ Referral code generates properly
□ Real-time balance updates work
□ Shared equity logic imported correctly
□ React Query caching works
□ No unnecessary refetches

---

### SPRINT 9: Wallet Screens (Days 17-18)

**CONTEXT:**
Equity service is ready. Now we build the wallet UI: balance overview and transaction history.

**OBJECTIVE:**
Create wallet screens that display equity balance and transaction history.

**REQUIREMENTS:**
- Build WalletScreen showing balance and recent transactions
- Build TransactionHistoryScreen with full list
- Build TransactionDetailModal showing transaction details
- Add equity point earning animations
- Implement pull-to-refresh
- Add infinite scroll for transaction history
- Show transaction types with icons
- Display friendly timestamps
- Add empty state for new users

**TECHNICAL SPECIFICATIONS:**
- Location: /screens/wallet/
- Components: /components/wallet/
- Data: Use hooks from Sprint 8
- Animations: Animated.Value for balance changes
- Icons: Different icon per transaction type
- Timestamps: Relative time (e.g., "2 hours ago")

**SCREENS TO CREATE:**

1. **WalletScreen.tsx**
   - Large balance card at top
   - "Recent Transactions" section (last 10)
   - "View All" button to history
   - Pull-to-refresh

2. **TransactionHistoryScreen.tsx**
   - Full list of all transactions
   - Group by date
   - Infinite scroll pagination
   - Pull-to-refresh
   - Search/filter by type

3. **TransactionDetailModal.tsx**
   - Transaction type, amount, timestamp
   - Description
   - Related info (referral name, etc.)
   - Blockchain-ready fields (for future)

**WALLET COMPONENTS:**
```typescript
// BalanceCard.tsx
interface BalanceCardProps {
  balance: number
  animated?: boolean
}

// TransactionItem.tsx
interface TransactionItemProps {
  transaction: Transaction
  onPress: () => void
}

// TransactionTypeIcon.tsx
- Signup: UserPlus icon
- Referral: Users icon
- Daily Active: Calendar icon
- Message: MessageSquare icon
- Subscription: CreditCard icon
```

**BALANCE ANIMATION:**
- Animate number change on balance update
- Pulse effect when points earned
- Haptic feedback on earning
- Confetti/celebration on milestones

**TRANSACTION TYPES UI:**
- Credit (+): Green text/icon
- Each type: Specific icon and description
- Timestamp: Relative time
- Amount: Large, prominent

**EXPECTED OUTPUT:**
- /screens/wallet/WalletScreen.tsx
- /screens/wallet/TransactionHistoryScreen.tsx
- /screens/wallet/TransactionDetailModal.tsx
- /components/wallet/BalanceCard.tsx
- /components/wallet/TransactionItem.tsx
- /components/wallet/TransactionTypeIcon.tsx
- Balance displays and animates
- Transactions list works
- Detail modal shows info
- Pull-to-refresh works
- Infinite scroll works

**VALIDATION CHECKLIST:**
□ Balance displays correctly
□ Balance animates on change
□ Recent transactions show
□ Can navigate to full history
□ Transaction history loads with pagination
□ Can tap transaction to see details
□ Transaction types display correctly
□ Timestamps are relative and readable
□ Pull-to-refresh works
□ Empty state shows for new users
□ Haptic feedback on earning points

---

### SPRINT 10: Apps Marketplace Service & Data (Days 22-23)

**CONTEXT:**
Wallet is complete. Now we build the Apps marketplace feature. This is required at launch and must include an Ampel app page with content matching the web app exactly.

**OBJECTIVE:**
Create apps marketplace service layer, implement data fetching, and prepare for marketplace UI.

**REQUIREMENTS:**
- Create apps service for fetching marketplace data
- Implement app details fetching
- Use same data structure as web app
- Set up React Query for apps data
- Implement caching strategy
- Handle app metadata (name, description, features, equity split)
- Prepare for future app submissions

**TECHNICAL SPECIFICATIONS:**
- Location: /services/api/apps.ts
- Shared Logic: Import from @ampel/shared if available
- Database: Supabase apps table
- State: React Query for server state
- Types: Match web app types exactly

**APPS SERVICE METHODS:**
```typescript
getApps(filters?) => Promise<App[]>
getAppById(appId) => Promise<App>
getAmpelApp() => Promise<App>  // Featured Ampel app
searchApps(query) => Promise<App[]>
```

**APP DATA STRUCTURE:**
```typescript
interface App {
  id: string
  name: string
  slug: string
  description: string
  longDescription: string
  icon: string
  screenshots: string[]
  category: string
  features: string[]
  equitySplit: {
    developer: number
    users: number
    platform: number
  }
  stats: {
    users: number
    conversations: number
    rating: number
  }
  status: 'active' | 'coming_soon' | 'beta'
  createdAt: Date
  updatedAt: Date
}
```

**REACT QUERY SETUP:**
```typescript
useApps(filters?)
useApp(appId)
useAmpelApp()  // For featured Ampel app
```

**AMPEL APP CONTENT:**
Must match web app exactly:
- Name: "Ampel"
- Description: "AI-powered conversations with equity ownership"
- Features: List all features from web
- Equity Split: 0% developer, 80% users, 20% platform
- Status: "active"

**EXPECTED OUTPUT:**
- /services/api/apps.ts
- /hooks/useApps.ts
- /hooks/useApp.ts
- /types/app.ts
- Can fetch apps list
- Can fetch single app details
- Can fetch Ampel app specifically
- React Query caching works
- Data structure matches web

**VALIDATION CHECKLIST:**
□ Can fetch apps list
□ Apps data structure matches web
□ Can fetch Ampel app details
□ Ampel app content matches web exactly
□ React Query caching works
□ No TypeScript errors
□ Service methods work correctly

---

### SPRINT 11: Apps Marketplace UI (Days 24-25)

**CONTEXT:**
Apps service is ready. Now we build the marketplace UI showing available apps.

**OBJECTIVE:**
Create the apps marketplace screen with grid/list view of apps.

**REQUIREMENTS:**
- Build AppsMarketplaceScreen with apps grid
- Implement search functionality
- Add category filtering
- Show featured Ampel app prominently
- Implement pull-to-refresh
- Add loading states
- Handle empty state
- Smooth navigation to app details

**TECHNICAL SPECIFICATIONS:**
- Location: /screens/apps/AppsMarketplaceScreen.tsx
- Components: /components/apps/
- Data: Use hooks from Sprint 10
- Layout: Grid view (2 columns) or list view
- Search: Filter by name/description
- Categories: Filter by category tags

**MARKETPLACE SCREEN FEATURES:**
- Search bar at top
- Featured section (Ampel app)
- Apps grid (2 columns) or list
- Category filter chips
- Pull-to-refresh
- Loading skeleton
- Empty state (no apps)
- Tap app → navigate to detail

**APPS COMPONENTS:**
```typescript
// AppCard.tsx
interface AppCardProps {
  app: App
  onPress: () => void
  featured?: boolean
}

// AppGrid.tsx
interface AppGridProps {
  apps: App[]
  onAppPress: (appId: string) => void
}

// CategoryFilter.tsx
interface CategoryFilterProps {
  categories: string[]
  selected?: string
  onSelect: (category: string) => void
}
```

**FEATURED SECTION:**
- Large card for Ampel app
- Prominent placement at top
- Shows icon, name, description
- "Featured" badge
- Tappable to app detail

**DESIGN REQUIREMENTS:**
- App cards show: icon, name, short description, rating
- Grid: 2 columns with spacing
- Cards: Rounded corners, shadow
- Featured: Larger card, different style
- Search: Instant filter (no API call)
- Categories: Horizontal scroll chips

**EXPECTED OUTPUT:**
- /screens/apps/AppsMarketplaceScreen.tsx
- /components/apps/AppCard.tsx
- /components/apps/AppGrid.tsx
- /components/apps/CategoryFilter.tsx
- Apps display in grid
- Featured app shows prominently
- Search filters apps
- Category filter works
- Pull-to-refresh works
- Navigation to detail works

**VALIDATION CHECKLIST:**
□ Apps marketplace loads
□ Ampel app shows in featured section
□ Apps display in grid (2 columns)
□ Search filters apps instantly
□ Category filter works
□ Can tap app to see details
□ Pull-to-refresh reloads apps
□ Loading state shows
□ Empty state shows (if no apps)
□ Smooth animations

---

### SPRINT 12: App Detail Page (Days 26-27)

**CONTEXT:**
Marketplace UI is complete. Now we build the app detail page showing full app information.

**OBJECTIVE:**
Create the app detail screen that shows comprehensive app information, matching web app content exactly for Ampel.

**REQUIREMENTS:**
- Build AppDetailScreen with full app information
- Show app header (icon, name, rating)
- Display long description
- Show features list
- Show equity split visualization
- Display screenshots gallery
- Show stats (users, conversations)
- Add "Open App" button (for Ampel, opens chat)
- Match web app design and content
- Implement image gallery for screenshots

**TECHNICAL SPECIFICATIONS:**
- Location: /screens/apps/AppDetailScreen.tsx
- Components: /components/apps/
- Data: Use useApp hook
- Images: react-native-image-viewing for gallery
- Navigation: Handle "Open App" action
- Styling: Match web app design

**APP DETAIL SCREEN SECTIONS:**

1. **Header**
   - App icon (large)
   - App name
   - Short description
   - Rating (stars)
   - "Open App" button

2. **Screenshots Gallery**
   - Horizontal scroll
   - Tap to expand fullscreen
   - Swipe between screenshots

3. **About Section**
   - Long description
   - Full feature list

4. **Equity Split**
   - Visual chart/bars
   - Percentages clearly shown
   - Developer: X%
   - Users: Y%
   - Platform: Z%

5. **Stats**
   - Active users count
   - Total conversations
   - Average rating
   - Released date

**AMPEL APP CONTENT:**
Must match web exactly:
- All description text
- All features listed
- Equity split: 0% dev, 80% users, 20% platform
- All screenshots (if any)
- All stats

**APP DETAIL COMPONENTS:**
```typescript
// AppHeader.tsx
interface AppHeaderProps {
  app: App
  onOpenApp: () => void
}

// FeatureList.tsx
interface FeatureListProps {
  features: string[]
}

// EquitySplitChart.tsx
interface EquitySplitChartProps {
  developer: number
  users: number
  platform: number
}

// ScreenshotsGallery.tsx
interface ScreenshotsGalleryProps {
  screenshots: string[]
}

// AppStats.tsx
interface AppStatsProps {
  users: number
  conversations: number
  rating: number
}
```

**"OPEN APP" ACTION:**
For Ampel:
- Button taps → navigate to Chat (main screen)
- Show toast: "Opening Ampel..."
- Haptic feedback

For future apps:
- Navigate to app-specific view
- Or external link

**DESIGN REQUIREMENTS:**
- Scrollable screen
- Large hero image/icon at top
- Clear sections with headers
- Feature list with checkmarks
- Equity split visual (bars or chart)
- Screenshots in horizontal scroll
- Stats in cards
- CTA button prominent and sticky

**EXPECTED OUTPUT:**
- /screens/apps/AppDetailScreen.tsx
- /components/apps/AppHeader.tsx
- /components/apps/FeatureList.tsx
- /components/apps/EquitySplitChart.tsx
- /components/apps/ScreenshotsGallery.tsx
- /components/apps/AppStats.tsx
- App details display correctly
- Ampel content matches web exactly
- "Open App" works for Ampel
- Screenshots gallery works
- Equity split visualization clear

**VALIDATION CHECKLIST:**
□ App detail screen loads
□ Header shows icon, name, rating
□ Long description displays
□ Features list shows all items
□ Equity split visualization clear and accurate
□ Screenshots gallery scrollable
□ Tapping screenshot opens fullscreen
□ Stats display correctly
□ "Open App" button works
□ For Ampel: matches web content exactly
□ Navigation works
□ Scroll performance smooth
□ Loading state shows while fetching

---

### SPRINT 13: Profile Hub & Navigation (Days 29-30)

**CONTEXT:**
All major features are complete. Now we build the Profile section, which serves as a hub for Settings and Referral Center (both nested under Profile, not in drawer).

**OBJECTIVE:**
Create the Profile hub screen showing user info with navigation to Settings and Referrals, and update those screens to be accessible from Profile.

**REQUIREMENTS:**
- Build ProfileScreen as hub with user info and navigation
- Show user avatar (placeholder or uploaded)
- Display user info (name, email, stats)
- Add navigation buttons to Settings and Referrals
- Implement profile editing
- Add logout button
- Show account stats
- Update Settings and Referrals screens to be nested (not drawer items)

**TECHNICAL SPECIFICATIONS:**
- Location: /screens/profile/ProfileScreen.tsx
- Navigation: Profile → Settings, Profile → Referrals
- Service: /services/api/profile.ts
- Forms: react-hook-form for editing
- Avatar: Placeholder for now (upload future)

**PROFILE SCREEN SECTIONS:**

1. **Header**
   - Avatar (large, circular)
   - Display name
   - Email (read-only)
   - "Edit Profile" button

2. **Account Stats**
   - Member since
   - Total equity points
   - Total conversations
   - Total messages

3. **Navigation Cards**
   - Settings card (tap → SettingsScreen)
   - Referral Center card (tap → ReferralScreen)

4. **Account Actions**
   - Logout button (bottom)

**PROFILE SERVICE METHODS:**
```typescript
getUserProfile(userId) => Promise<Profile>
updateProfile(userId, data) => Promise<Profile>
getAccountStats(userId) => Promise<Stats>
```

**PROFILE DATA:**
```typescript
interface Profile {
  id: string
  displayName: string
  email: string
  avatar?: string
  bio?: string
  createdAt: Date
}

interface Stats {
  memberSince: Date
  totalEquity: number
  totalConversations: number
  totalMessages: number
}
```

**DESIGN REQUIREMENTS:**
- Avatar centered at top
- User info below avatar
- Stats in grid (2x2)
- Navigation cards with icons and descriptions
- Settings card: Gear icon, "Settings", "App preferences & security"
- Referrals card: Users icon, "Referral Center", "Share and earn equity"
- Logout button at bottom (red text)
- Smooth navigation transitions

**NAVIGATION FLOW:**
```
DrawerNavigator → ProfileStack
                  ├── ProfileScreen (Hub)
                  ├── SettingsScreen ← from Profile
                  └── ReferralScreen ← from Profile
```

**EXPECTED OUTPUT:**
- /screens/profile/ProfileScreen.tsx
- /services/api/profile.ts
- Profile displays user info
- Stats display correctly
- Navigation to Settings works
- Navigation to Referrals works
- Edit profile button (navigates to edit screen)
- Logout button works
- Clean, organized layout

**VALIDATION CHECKLIST:**
□ Profile screen displays user info
□ Avatar shows (placeholder)
□ Stats display correctly (member since, equity, etc.)
□ Settings card tappable
□ Tapping Settings navigates to SettingsScreen
□ Referrals card tappable
□ Tapping Referrals navigates to ReferralScreen
□ Edit profile button works
□ Logout button shows confirmation
□ Logout clears session
□ Back button returns to profile from nested screens

---

### SPRINT 14: Settings Screen (Days 31-32)

**CONTEXT:**
Profile hub is complete. Now we build the Settings screen (accessed from Profile) with app preferences.

**OBJECTIVE:**
Create Settings screen with all app preferences and security options.

**REQUIREMENTS:**
- Build SettingsScreen (nested under Profile)
- Implement biometric toggle
- Add notification preferences
- Add theme selection
- Add data management options
- Add account actions
- Show app version
- Add legal links

**TECHNICAL SPECIFICATIONS:**
- Location: /screens/profile/SettingsScreen.tsx
- Navigation: Accessed from ProfileScreen (not drawer)
- Storage: expo-secure-store for sensitive, AsyncStorage for preferences
- Native Controls: Switch, Picker
- Platform: Platform-specific UI

**SETTINGS SECTIONS:**

1. **Security**
   - Biometric unlock toggle
   - Change password button

2. **Notifications**
   - Push notifications toggle
   - Email notifications toggle
   - New message alerts toggle

3. **App Preferences**
   - Theme (light/dark/auto)
   - Language (future)

4. **Data & Privacy**
   - Export my data button
   - Delete my data button
   - Privacy policy link
   - Terms of service link

5. **About**
   - App version (read-only)
   - Support/Help link

6. **Account**
   - Logout button (confirmation)
   - Delete account button (confirmation + warning)

**SETTINGS SERVICE:**
```typescript
toggleBiometrics(enabled) => Promise<void>
toggleNotifications(enabled) => Promise<void>
updateTheme(theme) => Promise<void>
exportUserData() => Promise<void>
requestDataDeletion() => Promise<void>
```

**DESIGN REQUIREMENTS:**
- Grouped sections with headers
- Native switches for toggles
- Buttons for actions
- Links open in browser
- Confirmation dialogs for destructive actions
- Back button to Profile in header

**EXPECTED OUTPUT:**
- /screens/profile/SettingsScreen.tsx
- Settings sections organized
- All toggles functional
- Biometric toggle updates correctly
- Notification toggles work
- Theme selection works
- Data export/deletion with confirmations
- Account actions with confirmations
- Version displays correctly
- Links open correctly

**VALIDATION CHECKLIST:**
□ Settings screen accessible from Profile
□ Back button returns to Profile
□ Biometric toggle works
□ Notification toggles work
□ Theme changes apply
□ Export data shows confirmation
□ Delete data shows warning
□ Logout shows confirmation
□ Delete account shows strong warning
□ Version number displays
□ Links open in browser
□ All settings persist

---

### SPRINT 15: Referral Center (Days 33-34)

**CONTEXT:**
Settings is complete. Now we build the Referral Center (accessed from Profile) with referral code sharing and stats.

**OBJECTIVE:**
Build referral center screen with code display, sharing functionality, and referral stats.

**REQUIREMENTS:**
- Build ReferralScreen (nested under Profile)
- Display user's referral code prominently
- Implement native share sheet
- Show referral stats (sent, completed, points earned)
- Show list of completed referrals
- Add "copy code" with feedback
- Implement referral deep linking
- Track referral attribution

**TECHNICAL SPECIFICATIONS:**
- Location: /screens/profile/ReferralScreen.tsx
- Navigation: Accessed from ProfileScreen (not drawer)
- Sharing: expo-sharing
- Clipboard: @react-native-clipboard/clipboard
- Haptics: expo-haptics
- Service: /services/api/referrals.ts

**REFERRAL SERVICE METHODS:**
```typescript
getReferralStats(userId) => Promise<ReferralStats>
getReferralsList(userId) => Promise<Referral[]>
validateReferralCode(code) => Promise<boolean>
trackReferralSignup(referrerId, referredId, code) => Promise<void>
shareReferralCode(code) => Promise<void>
```

**REFERRAL SCREEN SECTIONS:**

1. **Referral Code Card**
   - Large referral code display
   - "Share" button (native share sheet)
   - "Copy" button with haptic feedback

2. **Stats Cards**
   - Total Invites Sent
   - Completed Signups
   - Points Earned from Referrals

3. **Referral List**
   - List of completed referrals
   - Display name (or "Anonymous User")
   - Signup date
   - Points earned (50 each)

**SHARE FUNCTIONALITY:**
```typescript
Share referral code via:
- SMS
- Email
- WhatsApp
- Messenger
- Copy link
- More... (platform-specific)

Share message:
"Join Ampel and earn equity in AI apps! Use my code {CODE} to get 25 bonus points. Download: [app link]"
```

**DESIGN REQUIREMENTS:**
- Referral code in large, stylized card
- Easy to read and copy
- Share button prominent
- Stats cards in grid
- Referral list scrollable
- Empty state if no referrals
- Haptic feedback on copy
- Toast confirmation on copy

**EXPECTED OUTPUT:**
- /screens/profile/ReferralScreen.tsx
- /services/api/referrals.ts
- /services/platform/sharing.ts
- Referral code displays prominently
- Share button opens native sheet
- Copy button copies with feedback
- Stats display correctly
- Referral list shows completed signups
- Back button returns to Profile

**VALIDATION CHECKLIST:**
□ Referral screen accessible from Profile
□ Back button returns to Profile
□ Referral code displays correctly
□ Share button opens native share sheet
□ Can share to SMS, email, etc.
□ Copy button copies code
□ Haptic feedback on copy
□ Toast confirmation on copy
□ Stats display correctly (sent, completed, points)
□ Referral list shows completed signups
□ Empty state shows if no referrals
□ Navigation smooth

---

### SPRINT 16: Platform Polish & Launch Prep (Days 36-42)

**CONTEXT:**
All features are complete. Now we add platform-specific polish and prepare for launch.

**OBJECTIVE:**
Add iOS/Android polish, optimize performance, handle edge cases, and prepare for store submission.

**REQUIREMENTS:**

**iOS Polish:**
- Implement haptic feedback throughout app
- Add iOS-style animations and transitions
- Implement swipe gestures (back, dismiss)
- Add proper iOS safe area handling
- Use iOS-specific components where appropriate
- Test on iOS devices/simulator

**Android Polish:**
- Implement Material Design principles
- Add proper Android back button handling
- Use Android-specific components
- Add ripple effects on touchables
- Test on Android devices/emulator
- Handle Android-specific edge cases

**Performance:**
- Implement lazy loading for screens
- Add image caching and optimization
- Optimize FlatList performance
- Reduce bundle size
- Enable Hermes on Android
- Profile and fix performance issues

**Offline Support:**
- Cache conversations and messages
- Show offline indicator
- Queue actions when offline
- Sync when online
- Handle stale data

**Error Handling:**
- Global error boundary
- Network error handling
- API error handling
- Retry mechanisms
- User-friendly error messages

**Loading States:**
- Skeleton screens for loading
- Progressive loading
- Optimistic updates
- Loading indicators

**Store Prep:**
- App icons (all sizes)
- Screenshots (iOS & Android)
- App Store listing copy
- Play Store listing copy
- Privacy policy
- Terms of service

**TECHNICAL SPECIFICATIONS:**
- Haptics: expo-haptics (iOS)
- Animations: react-native-reanimated
- Offline: @react-native-async-storage/async-storage
- Error Boundary: react-error-boundary
- Performance: React.memo, useMemo, useCallback

**EXPECTED OUTPUT:**
- Haptic feedback throughout (iOS)
- Smooth animations (60fps)
- Proper gesture handling
- Material Design on Android
- Back button works correctly
- Performance optimized
- Offline mode works
- Errors handled gracefully
- Store assets ready
- App ready for submission

**VALIDATION CHECKLIST:**
□ Haptics work on iOS
□ Swipe gestures work on iOS
□ Animations smooth (60fps)
□ Android back button correct
□ Material Design on Android
□ App works offline (read mode)
□ Network errors handled
□ Loading states everywhere
□ No crashes or errors
□ Performance excellent
□ Store assets ready
□ Ready for submission

---

## RISKS & MITIGATION

### RISK: React Native Learning Curve
**Mitigation**: 
- Leverage Expo's abstractions
- Use React Native Directory for vetted libraries
- Follow official React Navigation patterns
- Ask Claude for RN-specific help when stuck

**Impact**: Medium (slower initial progress)
**Probability**: Medium (40%)

### RISK: Streaming Claude API on Mobile
**Mitigation**:
- Use same SSE approach as web
- Test on physical devices early
- Implement robust error handling
- Add request cancellation

**Impact**: High (core feature)
**Probability**: Low (20%) - proven pattern from web

### RISK: iOS App Store Rejection
**Mitigation**:
- Follow App Store guidelines strictly
- Clear explanation of equity (not cryptocurrency)
- Proper age ratings
- Complete privacy policy
- TestFlight beta first

**Impact**: High (launch delay)
**Probability**: Medium (30%)

### RISK: Android Performance Issues
**Mitigation**:
- Enable Hermes
- Profile early and often
- Optimize FlatLists
- Lazy load heavy components
- Test on low-end devices

**Impact**: Medium (poor UX)
**Probability**: Medium (40%)

### RISK: Apps Marketplace Content Mismatch
**Mitigation**:
- Share types/constants with web via /shared
- Validate Ampel content matches web exactly
- Test on multiple screen sizes
- Get design approval before implementation

**Impact**: Medium (inconsistent brand)
**Probability**: Low (20%)

### RISK: Scope Creep
**Mitigation**:
- Stick religiously to feature map
- Defer all "nice-to-haves" to post-launch
- Use this prompt doc as contract
- Say "no" to new features

**Impact**: High (missed deadline)
**Probability**: High (60%)

---

## SUCCESS METRICS

**Week 1**: Auth working, app navigates
**Week 2**: Chat fully functional with Claude
**Week 3**: Equity tracking and wallet complete
**Week 4**: Apps marketplace with Ampel page live
**Week 5**: Profile, Settings, Referrals complete
**Week 6**: Polished, tested, submitted to stores

**Launch Criteria:**
✅ User can sign up and login
✅ User can chat with Claude (streaming works)
✅ User can earn and view equity
✅ User can view Apps marketplace
✅ User can view Ampel app details (matching web)
✅ User can access profile, settings, referrals
✅ User can share referral code
✅ App works on iOS and Android
✅ 60fps performance
✅ No critical bugs
✅ Store-ready assets complete