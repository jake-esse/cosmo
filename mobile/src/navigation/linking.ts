import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import type { RootStackParamList } from './types';

/**
 * Deep linking configuration for the Ampel mobile app
 *
 * Supported URL schemes:
 * - ampel:// (custom scheme)
 * - https://ampel.app (universal links - future)
 *
 * Example URLs:
 * - ampel://auth/login
 * - ampel://auth/signup?ref=ABC123
 * - ampel://chat (default - opens Conversations list)
 * - ampel://chat/conversation-id-123
 * - ampel://apps
 * - ampel://apps/app-id-456
 * - ampel://wallet
 * - ampel://profile
 * - ampel://profile/settings
 * - ampel://profile/referrals
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    Linking.createURL('/'),
    'ampel://',
    // Universal links will be added later
    // 'https://ampel.app',
  ],
  config: {
    screens: {
      Splash: 'splash',
      Auth: {
        screens: {
          Welcome: 'welcome',
          Login: 'auth/login',
          Signup: {
            path: 'auth/signup',
            parse: {
              referralCode: (ref: string) => ref,
            },
          },
          ForgotPassword: 'auth/forgot-password',
        },
      },
      Main: {
        screens: {
          Conversations: {
            screens: {
              ConversationsList: 'chat',
              Chat: 'chat/:conversationId',
            },
          },
          Apps: {
            screens: {
              AppsMarketplace: 'apps',
              AppDetail: 'apps/:appId',
            },
          },
          Wallet: {
            screens: {
              WalletOverview: 'wallet',
            },
          },
          Profile: {
            screens: {
              Profile: 'profile',
              Settings: 'profile/settings',
              Referrals: 'profile/referrals',
            },
          },
        },
      },
    },
  },
};
