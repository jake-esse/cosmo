# Navigation Structure Fix: Duplicate Screen Names

## Problem

The navigation structure had duplicate "Chat" screen names causing React Navigation to show a warning:

```
Warning: Found screens with the same name nested inside one another.
Check: Main > Chat > Chat
```

### Root Cause

The navigation hierarchy had two screens named "Chat":

1. **Drawer level**: `Chat` (drawer item)
2. **Stack level**: `Chat` (screen within ChatStack showing individual conversation)

**Original structure:**
```
Main (Root)
└── Chat (Drawer) ← First "Chat"
    └── ChatStack
        ├── Conversations (List screen)
        └── Chat (Detail screen) ← Second "Chat" (DUPLICATE!)
```

This created the path: `Main > Chat > Chat` when opening a conversation.

## Solution

Renamed the navigation screens to have unique names throughout the hierarchy:

1. **Drawer screen**: Renamed from `Chat` to `Conversations` (matches the drawer label)
2. **Stack list screen**: Renamed from `Conversations` to `ConversationsList`
3. **Stack detail screen**: Kept as `Chat`

**New structure:**
```
Main (Root)
└── Conversations (Drawer) ← Unique name
    └── ChatStack
        ├── ConversationsList (List screen) ← Unique name
        └── Chat (Detail screen) ← Unique name
```

Now the path is: `Main > Conversations > Chat` (no duplicates!)

## Files Changed

### 1. `/mobile/src/navigation/types.ts`

**Before:**
```typescript
export type MainDrawerParamList = {
  Chat: undefined;  // ← Drawer screen
  Apps: undefined;
  Wallet: undefined;
  Profile: undefined;
};

export type ChatStackParamList = {
  Conversations: undefined;  // ← List screen
  Chat: { conversationId: string };  // ← Detail screen (DUPLICATE NAME!)
};
```

**After:**
```typescript
export type MainDrawerParamList = {
  Conversations: undefined;  // ✅ Renamed to match label
  Apps: undefined;
  Wallet: undefined;
  Profile: undefined;
};

export type ChatStackParamList = {
  ConversationsList: undefined;  // ✅ Renamed to be more specific
  Chat: { conversationId: string };  // ✅ Unique name
};
```

### 2. `/mobile/src/navigation/AppNavigator.tsx`

**Before:**
```typescript
<MainDrawer.Navigator
  initialRouteName="Chat"  // ← Old name
  // ...
>
  <MainDrawer.Screen
    name="Chat"  // ← Old name
    component={ChatStack}
    options={{
      drawerLabel: 'Conversations',
      // ...
    }}
  />
```

**After:**
```typescript
<MainDrawer.Navigator
  initialRouteName="Conversations"  // ✅ New name
  // ...
>
  <MainDrawer.Screen
    name="Conversations"  // ✅ New name (matches label)
    component={ChatStack}
    options={{
      drawerLabel: 'Conversations',
      // ...
    }}
  />
```

### 3. `/mobile/src/navigation/stacks/ChatStack.tsx`

**Before:**
```typescript
<Stack.Navigator>
  <Stack.Screen
    name="Conversations"  // ← Old name
    component={ConversationsScreen}
    options={{
      title: 'Conversations',
      // ...
    }}
  />
  <Stack.Screen
    name="Chat"  // Same as drawer item name (DUPLICATE!)
    component={ChatScreen}
    // ...
  />
```

**After:**
```typescript
<Stack.Navigator>
  <Stack.Screen
    name="ConversationsList"  // ✅ New, more specific name
    component={ConversationsScreen}
    options={{
      title: 'Conversations',  // Display title unchanged
      // ...
    }}
  />
  <Stack.Screen
    name="Chat"  // ✅ Now unique in hierarchy
    component={ChatScreen}
    // ...
  />
```

### 4. `/mobile/src/navigation/linking.ts`

**Before:**
```typescript
Main: {
  screens: {
    Chat: {  // ← Old drawer name
      screens: {
        Conversations: 'chat',  // ← Old stack screen name
        Chat: 'chat/:conversationId',
      },
    },
```

**After:**
```typescript
Main: {
  screens: {
    Conversations: {  // ✅ New drawer name
      screens: {
        ConversationsList: 'chat',  // ✅ New stack screen name
        Chat: 'chat/:conversationId',  // URLs unchanged
      },
    },
```

**Note:** The actual URLs remain the same:
- `ampel://chat` → Opens conversations list
- `ampel://chat/abc123` → Opens specific conversation

## Benefits

### ✅ No More Warnings
React Navigation no longer warns about duplicate screen names.

### ✅ Clearer Semantics
Screen names now clearly indicate their purpose:
- `Conversations` - The drawer item for the chat section
- `ConversationsList` - The list of all conversations
- `Chat` - An individual conversation

### ✅ Better Type Safety
TypeScript autocomplete now shows distinct screen names, making navigation code clearer.

### ✅ Consistent Naming
Drawer screen name (`Conversations`) now matches the drawer label shown in UI.

## Navigation Examples

### Navigating to Conversations List

**Before:**
```typescript
// Ambiguous - which "Chat"?
navigation.navigate('Chat');
```

**After:**
```typescript
// Clear - going to Conversations drawer item
navigation.navigate('Conversations');
```

### Navigating to Specific Conversation

The navigation to individual chat screens works the same way (from within the ChatStack):

```typescript
// Navigate to specific chat
navigation.navigate('Chat', { conversationId: '123' });
```

### Deep Linking

Deep links work exactly the same:
```
ampel://chat                    → ConversationsList screen
ampel://chat/conversation-123   → Chat screen (specific conversation)
```

## Verification

### TypeScript Check
```bash
npm run typecheck --workspace=@ampel/mobile
```
✅ All type checks pass

### Navigation Flow
1. App opens → Shows Conversations (default drawer item)
2. User sees ConversationsList screen
3. User taps a conversation → Shows Chat screen
4. No warning about duplicate names

## Migration Impact

### No Breaking Changes for Users
- UI labels remain the same ("Conversations" in drawer)
- Deep links work identically
- Navigation flow unchanged

### Code Changes Required
- ✅ Type definitions updated
- ✅ Screen component names updated
- ✅ Deep linking configuration updated
- ✅ No navigation calls needed updating (no hardcoded strings found)

## Related Files

**Navigation:**
- `/mobile/src/navigation/types.ts` - Type definitions
- `/mobile/src/navigation/AppNavigator.tsx` - Root navigation setup
- `/mobile/src/navigation/stacks/ChatStack.tsx` - Chat stack configuration
- `/mobile/src/navigation/linking.ts` - Deep linking configuration

**Screens:**
- `/mobile/src/screens/chat/ConversationsScreen.tsx` - List screen (unchanged)
- `/mobile/src/screens/chat/ChatScreen.tsx` - Detail screen (unchanged)

## Testing Checklist

- ✅ TypeScript compilation passes
- ✅ No duplicate screen name warnings
- ✅ Drawer shows "Conversations" item
- ✅ Can navigate to conversations list
- ✅ Can open individual conversations
- ✅ Deep links work (ampel://chat, ampel://chat/:id)
- ✅ Back navigation works correctly

## Summary

Fixed React Navigation warning about duplicate "Chat" screen names by renaming:

1. ✅ Drawer screen: `Chat` → `Conversations`
2. ✅ Stack list screen: `Conversations` → `ConversationsList`
3. ✅ Updated all type definitions
4. ✅ Updated deep linking configuration
5. ✅ No changes to UI or user-facing behavior

The navigation hierarchy now has unique screen names throughout, eliminating the `Main > Chat > Chat` nesting warning while maintaining all functionality.
