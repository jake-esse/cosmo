# SafeAreaView Migration to react-native-safe-area-context

## Problem

React Native's built-in `SafeAreaView` is deprecated and has limited functionality:
- Only works on iOS 11+ devices
- Doesn't work properly on Android
- No customization options
- Being phased out in favor of community solution

## Solution

Migrated to `react-native-safe-area-context` which provides:
- ✅ Cross-platform support (iOS + Android)
- ✅ More reliable safe area detection
- ✅ Customizable edges (top, bottom, left, right)
- ✅ Better performance
- ✅ Active maintenance

## Changes Made

### Package Verification
- ✅ `react-native-safe-area-context` v5.6.1 already installed in `mobile/package.json:38`

### App Root Setup
- ✅ `SafeAreaProvider` already wrapping app in `mobile/App.tsx:23-28`

### Files Updated

#### 1. `/mobile/src/screens/auth/WelcomeScreen.tsx`
**Before:**
```typescript
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
```

**After:**
```typescript
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
```

#### 2. `/mobile/src/screens/auth/LoginScreen.tsx`
**Before:**
```typescript
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
```

**After:**
```typescript
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
```

#### 3. `/mobile/src/screens/auth/ForgotPasswordScreen.tsx`
**Before:**
```typescript
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
```

**After:**
```typescript
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
```

#### 4. `/mobile/src/screens/auth/SignupScreen.tsx`
**Before:**
```typescript
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
```

**After:**
```typescript
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
```

#### Already Using Correct Import ✅
- `/mobile/src/components/common/LoadingState.tsx` - Already using `react-native-safe-area-context`
- `/mobile/src/components/common/EmptyState.tsx` - Already using `react-native-safe-area-context`

## How It Works

### 1. App Root Setup

The app is wrapped with `SafeAreaProvider` in the root component:

```typescript
// mobile/App.tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>  {/* Provides safe area context */}
        <NavigationContainer linking={linking}>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
```

### 2. Using SafeAreaView in Screens

Screens use `SafeAreaView` from the context:

```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

export function MyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Content automatically respects safe areas */}
      <View>...</View>
    </SafeAreaView>
  );
}
```

## Benefits

### ✅ Cross-Platform Consistency
- Works identically on iOS and Android
- Respects notches, status bars, home indicators on all devices

### ✅ Better Android Support
- Properly handles Android status bar and navigation bar
- Works with gesture navigation on Android 10+

### ✅ Customizable Edges
Can customize which edges to apply safe area:

```typescript
// Only apply safe area to top and bottom (not sides)
<SafeAreaView edges={['top', 'bottom']}>
  {/* ... */}
</SafeAreaView>

// Only top edge
<SafeAreaView edges={['top']}>
  {/* ... */}
</SafeAreaView>
```

### ✅ Hook Access
Access safe area insets programmatically:

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function MyComponent() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }}>
      {/* Custom padding based on safe area */}
    </View>
  );
}
```

## Verification

### TypeScript Check
```bash
npm run typecheck --workspace=@ampel/mobile
```
✅ All type checks pass

### Runtime Verification
```bash
npm run start --workspace=@ampel/mobile
```

Expected behavior:
- All screens respect device safe areas
- Content doesn't overlap with notches/status bars
- Navigation bars and buttons are accessible
- Works on both iOS and Android devices

## Migration Checklist

- ✅ `react-native-safe-area-context` package installed
- ✅ `SafeAreaProvider` wraps app root
- ✅ All `SafeAreaView` imports from `react-native` removed
- ✅ All `SafeAreaView` imports from `react-native-safe-area-context` added
- ✅ TypeScript compilation passes
- ✅ No deprecated import warnings

## Files Changed Summary

**Total Files Updated:** 4
1. `mobile/src/screens/auth/WelcomeScreen.tsx` - Updated import
2. `mobile/src/screens/auth/LoginScreen.tsx` - Updated import
3. `mobile/src/screens/auth/ForgotPasswordScreen.tsx` - Updated import
4. `mobile/src/screens/auth/SignupScreen.tsx` - Updated import

**Files Already Correct:** 2
1. `mobile/src/components/common/LoadingState.tsx` - ✅
2. `mobile/src/components/common/EmptyState.tsx` - ✅

**App Root:** Already configured
- `mobile/App.tsx` - Has `SafeAreaProvider` ✅

## Future Usage

When creating new screens, always use:

```typescript
// ✅ CORRECT
import { SafeAreaView } from 'react-native-safe-area-context';

// ❌ INCORRECT (deprecated)
import { SafeAreaView } from 'react-native';
```

## Related Documentation

- [Mobile Storage Split](./mobile-storage-split.md) - Supabase session storage strategy
- [Mobile Environment Fix](./mobile-env-fix.md) - Environment variable configuration
- [react-native-safe-area-context GitHub](https://github.com/th3rdwave/react-native-safe-area-context)

## Summary

Successfully migrated all `SafeAreaView` usage from React Native's deprecated built-in component to the modern `react-native-safe-area-context` library. This ensures:

1. ✅ Better cross-platform support
2. ✅ No deprecation warnings
3. ✅ Future-proof code
4. ✅ More customization options
5. ✅ Improved reliability on all devices

All screens now use the community-maintained solution with better Android support and more features.
