import type { User, Session } from '@supabase/supabase-js';

/**
 * Authentication Type Definitions
 * Type-safe interfaces for auth operations
 */

/**
 * Sign up credentials
 */
export interface SignUpCredentials {
  email: string;
  password: string;
  referralCode?: string;
}

/**
 * Sign in credentials
 */
export interface SignInCredentials {
  email: string;
  password: string;
}

/**
 * Auth error types
 */
export enum AuthErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  INVALID_EMAIL = 'INVALID_EMAIL',
  BIOMETRIC_NOT_AVAILABLE = 'BIOMETRIC_NOT_AVAILABLE',
  BIOMETRIC_NOT_ENROLLED = 'BIOMETRIC_NOT_ENROLLED',
  BIOMETRIC_FAILED = 'BIOMETRIC_FAILED',
  BIOMETRIC_NOT_ENABLED = 'BIOMETRIC_NOT_ENABLED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Structured auth error
 */
export class AuthError extends Error {
  type: AuthErrorType;
  originalError?: unknown;

  constructor(type: AuthErrorType, message: string, originalError?: unknown) {
    super(message);
    this.name = 'AuthError';
    this.type = type;
    this.originalError = originalError;
  }
}

/**
 * Auth state
 */
export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  biometricsEnabled: boolean;
  biometricsAvailable: boolean;
}

/**
 * Biometric configuration
 */
export interface BiometricConfig {
  enabled: boolean;
  email: string | null;
}

/**
 * Auth service response
 */
export interface AuthResponse {
  success: boolean;
  error?: AuthError;
  user?: User;
  session?: Session;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}
