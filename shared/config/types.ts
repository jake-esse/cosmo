/**
 * Configuration type definitions
 * Shared between web and mobile platforms
 */

export interface SupabaseConfig {
  /** Supabase project URL */
  url: string;
  /** Supabase anonymous/public API key */
  anonKey: string;
  /** Supabase service role key (server-side only, optional) */
  serviceRoleKey?: string;
}

export interface ApiConfig {
  /** Anthropic/Claude API key (optional, server-side only) */
  anthropic?: string;
  /** OpenAI API key (optional, server-side only) */
  openai?: string;
  /** xAI API key (optional, server-side only) */
  xai?: string;
  /** Google AI API key (optional, server-side only) */
  googleAi?: string;
}

export interface AppConfig {
  /** Application base URL */
  url: string;
  /** Application name */
  name: string;
}

export interface PlatformConfig {
  /** Running on Next.js (web) */
  isWeb: boolean;
  /** Running on Expo (mobile) */
  isMobile: boolean;
  /** Running on server (Node.js) */
  isServer: boolean;
}

export interface PersonaConfig {
  /** Persona API key for identity verification */
  apiKey?: string;
  /** Persona template ID */
  templateId?: string;
  /** Persona webhook secret */
  webhookSecret?: string;
}

export interface EmailConfig {
  /** Resend API key for email verification */
  resendApiKey?: string;
}

export interface AnalyticsConfig {
  /** Google Analytics measurement ID */
  gaMeasurementId?: string;
  /** Sentry DSN for error tracking */
  sentryDsn?: string;
}

/**
 * Complete application configuration
 */
export interface Config {
  supabase: SupabaseConfig;
  api: ApiConfig;
  app: AppConfig;
  platform: PlatformConfig;
  persona: PersonaConfig;
  email: EmailConfig;
  analytics: AnalyticsConfig;
}

/**
 * Environment variable validation error
 */
export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}
