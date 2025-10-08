/**
 * Runtime configuration validation
 * Validates required environment variables and provides clear error messages
 */

import type { Config } from './types';
import { ConfigValidationError } from './types';

/**
 * Validates required configuration values
 * Throws ConfigValidationError if validation fails
 */
export function validateConfig(config: Config): void {
  const errors: string[] = [];

  // Validate required Supabase configuration
  if (!config.supabase.url) {
    errors.push('Supabase URL is required');
  }

  if (!config.supabase.anonKey) {
    errors.push('Supabase anonymous key is required');
  }

  // Validate URL format for Supabase
  if (config.supabase.url && !isValidUrl(config.supabase.url)) {
    errors.push('Supabase URL must be a valid URL');
  }

  // Validate app URL if provided
  if (config.app.url && !isValidUrl(config.app.url)) {
    errors.push('App URL must be a valid URL');
  }

  // If there are errors, throw with all messages
  if (errors.length > 0) {
    const platform = config.platform.isWeb ? 'Next.js (web)' :
                     config.platform.isMobile ? 'Expo (mobile)' :
                     'unknown platform';

    throw new ConfigValidationError(
      `Configuration validation failed for ${platform}:\n` +
      errors.map(e => `  - ${e}`).join('\n') +
      '\n\nPlease check your root .env.local file and ensure all required variables are set.'
    );
  }
}

/**
 * Validates URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that at least one AI provider API key is configured (for server-side)
 * Returns warning message if none are configured, null if at least one exists
 */
export function validateAiProviders(config: Config): string | null {
  if (!config.platform.isServer) {
    return null; // Only validate on server
  }

  const hasProvider =
    !!config.api.anthropic ||
    !!config.api.openai ||
    !!config.api.googleAi ||
    !!config.api.xai;

  if (!hasProvider) {
    return 'Warning: No AI provider API keys configured. ' +
           'Set at least one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_AI_API_KEY, or XAI_API_KEY';
  }

  return null;
}

/**
 * Logs configuration status (useful for debugging)
 */
export function logConfigStatus(config: Config): void {
  const platform = config.platform.isWeb ? 'Web (Next.js)' :
                   config.platform.isMobile ? 'Mobile (Expo)' :
                   'Unknown';

  console.log('🔧 Configuration loaded:');
  console.log(`   Platform: ${platform}`);
  console.log(`   Server: ${config.platform.isServer}`);
  console.log(`   Supabase URL: ${config.supabase.url ? '✓' : '✗'}`);
  console.log(`   Supabase Anon Key: ${config.supabase.anonKey ? '✓' : '✗'}`);

  if (config.platform.isServer) {
    console.log(`   Supabase Service Key: ${config.supabase.serviceRoleKey ? '✓' : '✗'}`);
    console.log(`   AI Providers:`);
    console.log(`     - Anthropic: ${config.api.anthropic ? '✓' : '✗'}`);
    console.log(`     - OpenAI: ${config.api.openai ? '✓' : '✗'}`);
    console.log(`     - Google AI: ${config.api.googleAi ? '✓' : '✗'}`);
    console.log(`     - xAI: ${config.api.xai ? '✓' : '✗'}`);
  }
}
