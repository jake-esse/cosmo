import { supabase } from '@/services/supabase';
import { secureStorage, SECURE_STORAGE_KEYS } from '@/services/storage/secure';
import { biometricsService } from '@/services/platform/biometrics';
import {
  AuthError,
  AuthErrorType,
  type SignUpCredentials,
  type SignInCredentials,
  type AuthResponse,
} from '@/types/auth';

/**
 * Auth Service
 * Comprehensive authentication service layer
 * Handles all auth operations with proper error handling and security
 */

/**
 * Validate email format
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Parse Supabase auth error into structured AuthError
 */
const parseAuthError = (error: unknown): AuthError => {
  if (!error) {
    return new AuthError(AuthErrorType.UNKNOWN_ERROR, 'An unknown error occurred', error);
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return new AuthError(
      AuthErrorType.NETWORK_ERROR,
      'Unable to connect. Please check your internet.',
      error
    );
  }

  // Invalid credentials
  if (lowerMessage.includes('invalid') && (lowerMessage.includes('password') || lowerMessage.includes('credentials'))) {
    return new AuthError(AuthErrorType.INVALID_CREDENTIALS, 'Invalid email or password.', error);
  }

  // User not found
  if (lowerMessage.includes('user not found') || lowerMessage.includes('no user found')) {
    return new AuthError(AuthErrorType.USER_NOT_FOUND, 'No account found with this email.', error);
  }

  // Email already exists
  if (lowerMessage.includes('already registered') || lowerMessage.includes('already exists')) {
    return new AuthError(
      AuthErrorType.EMAIL_ALREADY_EXISTS,
      'An account with this email already exists.',
      error
    );
  }

  // Weak password
  if (lowerMessage.includes('password') && (lowerMessage.includes('weak') || lowerMessage.includes('short'))) {
    return new AuthError(
      AuthErrorType.WEAK_PASSWORD,
      'Password must be at least 8 characters.',
      error
    );
  }

  // Session expired
  if (lowerMessage.includes('session') && lowerMessage.includes('expired')) {
    return new AuthError(AuthErrorType.SESSION_EXPIRED, 'Your session has expired. Please sign in again.', error);
  }

  // Default unknown error
  return new AuthError(AuthErrorType.UNKNOWN_ERROR, 'An error occurred. Please try again.', error);
};

export const authService = {
  /**
   * Sign up a new user
   * @param credentials - Sign up credentials (email, password, optional referral code)
   * @returns Auth response with user and session
   */
  async signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
    try {
      // Validate email
      if (!isValidEmail(credentials.email)) {
        throw new AuthError(AuthErrorType.INVALID_EMAIL, 'Please enter a valid email address.');
      }

      // Validate password
      if (credentials.password.length < 8) {
        throw new AuthError(AuthErrorType.WEAK_PASSWORD, 'Password must be at least 8 characters.');
      }

      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            referral_code: credentials.referralCode,
          },
        },
      });

      if (error) throw error;

      if (!data.user || !data.session) {
        throw new Error('Sign up succeeded but no user or session returned');
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
      };
    } catch (error) {
      console.error('[AuthService] Sign up error:', error);
      return {
        success: false,
        error: error instanceof AuthError ? error : parseAuthError(error),
      };
    }
  },

  /**
   * Sign in an existing user
   * @param credentials - Sign in credentials (email, password)
   * @returns Auth response with user and session
   */
  async signIn(credentials: SignInCredentials): Promise<AuthResponse> {
    try {
      // Validate email
      if (!isValidEmail(credentials.email)) {
        throw new AuthError(AuthErrorType.INVALID_EMAIL, 'Please enter a valid email address.');
      }

      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;

      if (!data.user || !data.session) {
        throw new Error('Sign in succeeded but no user or session returned');
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
      };
    } catch (error) {
      console.error('[AuthService] Sign in error:', error);
      return {
        success: false,
        error: error instanceof AuthError ? error : parseAuthError(error),
      };
    }
  },

  /**
   * Sign in with biometrics
   * Retrieves stored email and authenticates with biometrics
   * @returns Auth response with user and session
   */
  async signInWithBiometrics(): Promise<AuthResponse> {
    try {
      // Check if biometrics are enabled
      const biometricsEnabled = await secureStorage.getItem(SECURE_STORAGE_KEYS.BIOMETRIC_ENABLED);
      if (!biometricsEnabled || biometricsEnabled !== 'true') {
        throw new AuthError(
          AuthErrorType.BIOMETRIC_NOT_ENABLED,
          'Biometric authentication is not enabled.'
        );
      }

      // Get stored email
      const email = await secureStorage.getItem(SECURE_STORAGE_KEYS.BIOMETRIC_EMAIL);
      if (!email) {
        throw new AuthError(
          AuthErrorType.BIOMETRIC_NOT_ENABLED,
          'No biometric credentials found. Please sign in with email and password.'
        );
      }

      // Check biometrics availability
      const isReady = await biometricsService.isReady();
      if (!isReady) {
        const isAvailable = await biometricsService.isAvailable();
        if (!isAvailable) {
          throw new AuthError(
            AuthErrorType.BIOMETRIC_NOT_AVAILABLE,
            'Biometric authentication is not available on this device.'
          );
        }
        throw new AuthError(
          AuthErrorType.BIOMETRIC_NOT_ENROLLED,
          'Please set up biometrics in your device settings.'
        );
      }

      // Authenticate with biometrics
      const biometricName = await biometricsService.getBiometricName();
      const authenticated = await biometricsService.authenticate(
        `Sign in to Ampel with ${biometricName}`
      );

      if (!authenticated) {
        throw new AuthError(
          AuthErrorType.BIOMETRIC_FAILED,
          'Biometric authentication failed. Please try again.'
        );
      }

      // Get current session (should already exist from previous login)
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (!data.session) {
        // Session expired, need to sign in with credentials again
        throw new AuthError(
          AuthErrorType.SESSION_EXPIRED,
          'Your session has expired. Please sign in again with email and password.'
        );
      }

      return {
        success: true,
        user: data.session.user,
        session: data.session,
      };
    } catch (error) {
      console.error('[AuthService] Biometric sign in error:', error);
      return {
        success: false,
        error: error instanceof AuthError ? error : parseAuthError(error),
      };
    }
  },

  /**
   * Sign out the current user
   * Clears session and optionally clears biometric data
   * @returns Auth response
   */
  async signOut(): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('[AuthService] Sign out error:', error);
      return {
        success: false,
        error: parseAuthError(error),
      };
    }
  },

  /**
   * Request password reset email
   * @param email - User's email address
   * @returns Auth response
   */
  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      // Validate email
      if (!isValidEmail(email)) {
        throw new AuthError(AuthErrorType.INVALID_EMAIL, 'Please enter a valid email address.');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('[AuthService] Password reset error:', error);
      return {
        success: false,
        error: error instanceof AuthError ? error : parseAuthError(error),
      };
    }
  },

  /**
   * Get current authenticated user
   * @returns Current user or null
   */
  async getCurrentUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    } catch (error) {
      console.error('[AuthService] Get current user error:', error);
      return null;
    }
  },

  /**
   * Get current session
   * @returns Current session or null
   */
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('[AuthService] Get session error:', error);
      return null;
    }
  },

  /**
   * Enable biometric authentication for current user
   * Stores email for future biometric logins
   * @returns Auth response
   */
  async setupBiometrics(): Promise<AuthResponse> {
    try {
      // Check if biometrics are ready
      const isReady = await biometricsService.isReady();
      if (!isReady) {
        const isAvailable = await biometricsService.isAvailable();
        if (!isAvailable) {
          throw new AuthError(
            AuthErrorType.BIOMETRIC_NOT_AVAILABLE,
            'Biometric authentication is not available on this device.'
          );
        }
        throw new AuthError(
          AuthErrorType.BIOMETRIC_NOT_ENROLLED,
          'Please set up biometrics in your device settings first.'
        );
      }

      // Get current user
      const user = await this.getCurrentUser();
      if (!user?.email) {
        throw new AuthError(AuthErrorType.UNKNOWN_ERROR, 'No user is currently signed in.');
      }

      // Test biometric authentication
      const biometricName = await biometricsService.getBiometricName();
      const authenticated = await biometricsService.authenticate(
        `Enable ${biometricName} for Ampel`
      );

      if (!authenticated) {
        throw new AuthError(
          AuthErrorType.BIOMETRIC_FAILED,
          'Biometric authentication failed. Please try again.'
        );
      }

      // Store email and enable flag
      await secureStorage.setItem(SECURE_STORAGE_KEYS.BIOMETRIC_EMAIL, user.email);
      await secureStorage.setItem(SECURE_STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');

      return { success: true };
    } catch (error) {
      console.error('[AuthService] Setup biometrics error:', error);
      return {
        success: false,
        error: error instanceof AuthError ? error : parseAuthError(error),
      };
    }
  },

  /**
   * Disable biometric authentication
   * Clears stored biometric credentials
   * @returns Auth response
   */
  async disableBiometrics(): Promise<AuthResponse> {
    try {
      await secureStorage.removeItem(SECURE_STORAGE_KEYS.BIOMETRIC_EMAIL);
      await secureStorage.removeItem(SECURE_STORAGE_KEYS.BIOMETRIC_ENABLED);

      return { success: true };
    } catch (error) {
      console.error('[AuthService] Disable biometrics error:', error);
      return {
        success: false,
        error: parseAuthError(error),
      };
    }
  },

  /**
   * Check if biometrics are enabled for current user
   * @returns true if biometrics are enabled
   */
  async isBiometricsEnabled(): Promise<boolean> {
    try {
      const enabled = await secureStorage.getItem(SECURE_STORAGE_KEYS.BIOMETRIC_ENABLED);
      return enabled === 'true';
    } catch (error) {
      console.error('[AuthService] Check biometrics enabled error:', error);
      return false;
    }
  },
};
