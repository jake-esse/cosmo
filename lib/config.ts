/**
 * Application Configuration
 *
 * Centralizes environment-dependent configuration for the app.
 * Used by both web and mobile (Capacitor) builds.
 */

/**
 * API Base URL
 * - In production (mobile): Points to Vercel deployment
 * - In development: Points to localhost:3000
 * - Can be overridden with NEXT_PUBLIC_API_BASE_URL environment variable
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://cosmo-git-feature-capacitor-mobile-test-ampel.vercel.app'
    : 'http://localhost:3000');

/**
 * Helper to construct full API URLs
 * @param path - API path (e.g., '/api/chat/stream')
 * @returns Full URL to API endpoint
 */
export function getApiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
