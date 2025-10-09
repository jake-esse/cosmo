import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import { authService } from '@/services/api/auth';
import { biometricsService } from '@/services/platform/biometrics';
import type { SignUpCredentials, SignInCredentials, AuthError } from '@/types/auth';
import { asyncStorage, ASYNC_STORAGE_KEYS } from '@/services/storage/async';

/**
 * Auth Context Type Definition
 * Provides auth state and methods to entire app
 */
interface AuthContextType {
  // Auth state
  user: User | null;
  session: Session | null;
  loading: boolean;
  biometricsEnabled: boolean;
  biometricsAvailable: boolean;

  // Auth methods
  signUp: (credentials: SignUpCredentials) => Promise<{ success: boolean; error?: AuthError }>;
  signIn: (credentials: SignInCredentials) => Promise<{ success: boolean; error?: AuthError }>;
  signInWithBiometrics: () => Promise<{ success: boolean; error?: AuthError }>;
  signOut: () => Promise<{ success: boolean; error?: AuthError }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: AuthError }>;
  setupBiometrics: () => Promise<{ success: boolean; error?: AuthError }>;
  disableBiometrics: () => Promise<{ success: boolean; error?: AuthError }>;
  refreshBiometricsState: () => Promise<void>;
}

// Create context with undefined default (will throw if used outside provider)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Track daily active bonus
 * Awards 10 points once per day when user launches app
 * Uses AsyncStorage to track last active date
 */
async function trackDailyActive(userId: string): Promise<void> {
  try {
    const lastActive = await asyncStorage.getItem(ASYNC_STORAGE_KEYS.LAST_ACTIVE_DATE);
    const today = new Date().toDateString();

    if (lastActive !== today) {
      const requestId = `daily-${userId}-${today}`;

      const { error } = await supabase.rpc('award_equity_points', {
        p_user_id: userId,
        p_action_type: 'daily_active',
        p_amount: 10,
        p_request_id: requestId,
        p_description: 'Daily active bonus',
        p_app_id: null,
      } as any);

      if (error) {
        console.error('[Auth] Error awarding daily active bonus:', error);
      } else {
        console.log('[Auth] Daily active bonus awarded');
        await asyncStorage.setItem(ASYNC_STORAGE_KEYS.LAST_ACTIVE_DATE, today);
      }
    }
  } catch (error) {
    console.error('[Auth] Failed to track daily active:', error);
    // Don't block app launch on equity error
  }
}

/**
 * Auth Provider Component
 * Manages global authentication state and provides auth methods
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  /**
   * Check biometrics state
   */
  const refreshBiometricsState = useCallback(async () => {
    try {
      const [enabled, available] = await Promise.all([
        authService.isBiometricsEnabled(),
        biometricsService.isReady(),
      ]);

      setBiometricsEnabled(enabled);
      setBiometricsAvailable(available);
    } catch (error) {
      console.error('[AuthContext] Error refreshing biometrics state:', error);
    }
  }, []);

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          await refreshBiometricsState();

          // Award daily active bonus (Sprint 8)
          if (currentSession?.user) {
            await trackDailyActive(currentSession.user.id);
          }
        }
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (mounted) {
          setSession(newSession);
          setUser(newSession?.user ?? null);

          // Refresh biometrics state when auth state changes
          await refreshBiometricsState();
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshBiometricsState]);

  /**
   * Sign up new user
   */
  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    setLoading(true);
    try {
      const response = await authService.signUp(credentials);

      if (response.success && response.user && response.session) {
        setUser(response.user);
        setSession(response.session);
      }

      return {
        success: response.success,
        error: response.error,
      };
    } catch (error) {
      console.error('[AuthContext] Sign up error:', error);
      return {
        success: false,
        error: error as AuthError,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign in existing user
   */
  const signIn = useCallback(async (credentials: SignInCredentials) => {
    setLoading(true);
    try {
      const response = await authService.signIn(credentials);

      if (response.success && response.user && response.session) {
        setUser(response.user);
        setSession(response.session);
      }

      return {
        success: response.success,
        error: response.error,
      };
    } catch (error) {
      console.error('[AuthContext] Sign in error:', error);
      return {
        success: false,
        error: error as AuthError,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign in with biometrics
   */
  const signInWithBiometrics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authService.signInWithBiometrics();

      if (response.success && response.user && response.session) {
        setUser(response.user);
        setSession(response.session);
      }

      return {
        success: response.success,
        error: response.error,
      };
    } catch (error) {
      console.error('[AuthContext] Biometric sign in error:', error);
      return {
        success: false,
        error: error as AuthError,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign out current user
   */
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authService.signOut();

      if (response.success) {
        setUser(null);
        setSession(null);
        // Don't clear biometrics settings on sign out
        // User may want to use biometrics for next login
      }

      return {
        success: response.success,
        error: response.error,
      };
    } catch (error) {
      console.error('[AuthContext] Sign out error:', error);
      return {
        success: false,
        error: error as AuthError,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Request password reset
   */
  const resetPassword = useCallback(async (email: string) => {
    try {
      const response = await authService.resetPassword(email);
      return {
        success: response.success,
        error: response.error,
      };
    } catch (error) {
      console.error('[AuthContext] Password reset error:', error);
      return {
        success: false,
        error: error as AuthError,
      };
    }
  }, []);

  /**
   * Enable biometric authentication
   */
  const setupBiometrics = useCallback(async () => {
    try {
      const response = await authService.setupBiometrics();

      if (response.success) {
        await refreshBiometricsState();
      }

      return {
        success: response.success,
        error: response.error,
      };
    } catch (error) {
      console.error('[AuthContext] Setup biometrics error:', error);
      return {
        success: false,
        error: error as AuthError,
      };
    }
  }, [refreshBiometricsState]);

  /**
   * Disable biometric authentication
   */
  const disableBiometrics = useCallback(async () => {
    try {
      const response = await authService.disableBiometrics();

      if (response.success) {
        await refreshBiometricsState();
      }

      return {
        success: response.success,
        error: response.error,
      };
    } catch (error) {
      console.error('[AuthContext] Disable biometrics error:', error);
      return {
        success: false,
        error: error as AuthError,
      };
    }
  }, [refreshBiometricsState]);

  const value: AuthContextType = {
    // State
    user,
    session,
    loading,
    biometricsEnabled,
    biometricsAvailable,

    // Methods
    signUp,
    signIn,
    signInWithBiometrics,
    signOut,
    resetPassword,
    setupBiometrics,
    disableBiometrics,
    refreshBiometricsState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 * Must be used within AuthProvider
 * @throws Error if used outside AuthProvider
 */
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}
