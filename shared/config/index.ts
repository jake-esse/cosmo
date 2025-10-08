/**
 * Shared configuration for Ampel platform
 * Single source of truth for environment variables across web and mobile
 *
 * Usage:
 *   import { config } from '@ampel/shared/config';
 *   const supabase = createClient(config.supabase.url, config.supabase.anonKey);
 */

import type { Config } from './types';
import { detectPlatform, getEnvVar, getServerEnvVar } from './env';
import { validateConfig, validateAiProviders, logConfigStatus } from './validation';

/**
 * Load and validate configuration
 * This runs once when the module is imported
 */
function loadConfig(): Config {
  const platform = detectPlatform();

  const config: Config = {
    // Supabase configuration (required)
    supabase: {
      url: getEnvVar('SUPABASE_URL', true) || '',
      anonKey: getEnvVar('SUPABASE_ANON_KEY', true) || '',
      // Service role key only available on server
      serviceRoleKey: platform.isServer
        ? getServerEnvVar('SUPABASE_SERVICE_ROLE_KEY')
        : undefined,
    },

    // AI Provider API keys (optional, server-only)
    api: {
      anthropic: platform.isServer
        ? getServerEnvVar('ANTHROPIC_API_KEY')
        : undefined,
      openai: platform.isServer
        ? getServerEnvVar('OPENAI_API_KEY')
        : undefined,
      xai: platform.isServer
        ? getServerEnvVar('XAI_API_KEY')
        : undefined,
      googleAi: platform.isServer
        ? getServerEnvVar('GOOGLE_AI_API_KEY')
        : undefined,
    },

    // Application configuration
    app: {
      url: getEnvVar('APP_URL') ||
           (platform.isWeb ? 'http://localhost:3000' : 'http://localhost:8081'),
      name: 'Ampel',
    },

    // Platform detection flags
    platform,

    // Persona identity verification (optional, server-only)
    persona: {
      apiKey: platform.isServer
        ? getServerEnvVar('PERSONA_API_KEY')
        : undefined,
      templateId: platform.isServer
        ? getServerEnvVar('PERSONA_TEMPLATE_ID')
        : undefined,
      webhookSecret: platform.isServer
        ? getServerEnvVar('PERSONA_WEBHOOK_SECRET')
        : undefined,
    },

    // Email configuration (optional, server-only)
    email: {
      resendApiKey: platform.isServer
        ? getServerEnvVar('RESEND_VERIFICATION_API_KEY')
        : undefined,
    },

    // Analytics configuration (optional)
    analytics: {
      gaMeasurementId: getEnvVar('GA_MEASUREMENT_ID'),
      sentryDsn: getEnvVar('SENTRY_DSN'),
    },
  };

  // Validate required configuration
  validateConfig(config);

  // Warn if no AI providers configured (non-fatal)
  const aiWarning = validateAiProviders(config);
  if (aiWarning && platform.isServer) {
    console.warn(`⚠️  ${aiWarning}`);
  }

  // Log config status in development
  if (process.env.NODE_ENV === 'development') {
    logConfigStatus(config);
  }

  return config;
}

/**
 * Singleton configuration object
 * Loaded once and reused across the application
 */
export const config = loadConfig();

/**
 * Re-export types for convenience
 */
export type {
  Config,
  SupabaseConfig,
  ApiConfig,
  AppConfig,
  PlatformConfig,
  PersonaConfig,
  EmailConfig,
  AnalyticsConfig,
} from './types';

export { ConfigValidationError } from './types';
