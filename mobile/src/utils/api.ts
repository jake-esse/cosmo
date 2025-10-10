/**
 * API URL Generation Utilities
 *
 * Handles generating correct API URLs for both development and production
 * environments in Expo apps.
 *
 * Development: Uses Expo's experienceUrl (converted from exp:// to http://)
 * Production: Uses EXPO_PUBLIC_API_BASE_URL environment variable
 *
 * @see https://ai-sdk.dev/docs/getting-started/expo
 */

import Constants from 'expo-constants';

/**
 * Generates a full API URL from a relative path
 *
 * @param relativePath - The API endpoint path (e.g., '/api/chat' or 'api/chat')
 * @returns Full URL to the API endpoint
 * @throws Error if EXPO_PUBLIC_API_BASE_URL is not set in production
 *
 * @example
 * // Development (local)
 * generateAPIUrl('/api/chat')
 * // Returns: 'http://192.168.1.100:8081/api/chat'
 *
 * @example
 * // Production
 * generateAPIUrl('/api/chat')
 * // Returns: 'https://api.ampel.ai/api/chat'
 */
export const generateAPIUrl = (relativePath: string): string => {
  // Ensure path starts with a slash
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  // Development mode: Use Expo's experienceUrl
  if (process.env.NODE_ENV === 'development') {
    // Convert exp:// protocol to http:// for local development
    const origin = Constants.experienceUrl?.replace('exp://', 'http://') ?? '';
    return origin.concat(path);
  }

  // Production mode: Use environment variable
  if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL environment variable is not defined. ' +
        'Please set it in your .env file or app configuration.'
    );
  }

  return process.env.EXPO_PUBLIC_API_BASE_URL.concat(path);
};
