/**
 * Environment variable loader with cross-platform support
 * Handles both Next.js (NEXT_PUBLIC_*) and Expo (EXPO_PUBLIC_*) prefixes
 */

import type { PlatformConfig } from './types';

/**
 * Detect the current platform
 */
export function detectPlatform(): PlatformConfig {
  // Check if we're on server (Node.js)
  const isServer = typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null;

  // Check for React Native environment (Expo/mobile)
  // React Native defines navigator.product === 'ReactNative'
  // Access via globalThis to avoid TypeScript errors in non-DOM environments
  const globalNav = (globalThis as any).navigator;
  const isReactNative = globalNav !== undefined &&
    globalNav.product === 'ReactNative';

  // Check if we're in a Next.js environment
  const isNext = typeof process !== 'undefined' &&
    !isReactNative &&
    (process.env.NEXT_RUNTIME !== undefined ||
     process.env.__NEXT_PRIVATE_PREBUNDLED_REACT !== undefined);

  return {
    isWeb: isNext,
    isMobile: isReactNative,
    isServer: isServer && !isReactNative,
  };
}

/**
 * Get environment variable with platform-aware prefix handling
 * Tries platform-specific prefix first, then falls back to alternative
 */
export function getEnvVar(name: string, required = false): string | undefined {
  const platform = detectPlatform();

  let value: string | undefined;

  // For public variables, try platform-specific prefix first
  if (platform.isWeb) {
    // Next.js: Try NEXT_PUBLIC_ prefix first
    value = process.env[`NEXT_PUBLIC_${name}`];
    if (!value) {
      // Fallback: Try EXPO_PUBLIC_ (for shared .env.local)
      value = process.env[`EXPO_PUBLIC_${name}`];
    }
  } else if (platform.isMobile) {
    // Expo: Try EXPO_PUBLIC_ prefix first
    value = process.env[`EXPO_PUBLIC_${name}`];
    if (!value) {
      // Fallback: Try NEXT_PUBLIC_ (for shared .env.local)
      value = process.env[`NEXT_PUBLIC_${name}`];
    }
  } else {
    // Unknown platform: Try both prefixes
    value = process.env[`NEXT_PUBLIC_${name}`] ||
            process.env[`EXPO_PUBLIC_${name}`];
  }

  // For server-only variables (no prefix)
  if (!value && platform.isServer) {
    value = process.env[name];
  }

  if (required && !value) {
    const prefix = platform.isWeb ? 'NEXT_PUBLIC_' :
                   platform.isMobile ? 'EXPO_PUBLIC_' :
                   '';
    throw new Error(
      `Missing required environment variable: ${prefix}${name}\n` +
      `Please ensure it's set in your root .env.local file.`
    );
  }

  return value;
}

/**
 * Get server-only environment variable (no public prefix)
 */
export function getServerEnvVar(name: string, required = false): string | undefined {
  const value = process.env[name];

  if (required && !value) {
    throw new Error(
      `Missing required server environment variable: ${name}\n` +
      `Please ensure it's set in your root .env.local file.`
    );
  }

  return value;
}

/**
 * Check if a variable exists (useful for optional config)
 */
export function hasEnvVar(name: string): boolean {
  return getEnvVar(name) !== undefined;
}
