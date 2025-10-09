/**
 * Navigation type definitions for type-safe navigation
 */

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: { referralCode?: string };
  ForgotPassword: undefined;
};

/**
 * Main Drawer Navigation (4 items)
 * Conversations is the default screen
 */
export type MainDrawerParamList = {
  Conversations: undefined;
  Apps: undefined;
  Wallet: undefined;
  Profile: undefined;
};

/**
 * Chat Stack (under Conversations drawer item)
 * Conversations list and individual chat screen
 */
export type ChatStackParamList = {
  ConversationsList: undefined;
  Chat: { conversationId: string };
};

/**
 * Apps Stack (under Apps drawer item)
 * Apps marketplace list and individual app detail
 */
export type AppsStackParamList = {
  AppsMarketplace: undefined;
  AppDetail: { appId: string };
};

/**
 * Wallet Stack (under Wallet drawer item)
 */
export type WalletStackParamList = {
  WalletOverview: undefined;
};

/**
 * Profile Stack (under Profile drawer item)
 * Profile is a hub that navigates to Settings and Referrals
 */
export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  Referrals: undefined;
};
