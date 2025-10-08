import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Hook to access authentication state and methods
 * Convenience wrapper around useAuthContext with additional computed properties
 *
 * @example
 * ```tsx
 * const { user, loading, isAuthenticated, signIn, signOut } = useAuth();
 *
 * if (loading) return <LoadingSpinner />;
 * if (!isAuthenticated) return <LoginScreen />;
 * return <Dashboard user={user} />;
 * ```
 */
export function useAuth() {
  const context = useAuthContext();

  return {
    // State
    user: context.user,
    session: context.session,
    loading: context.loading,
    isAuthenticated: !!context.user,
    biometricsEnabled: context.biometricsEnabled,
    biometricsAvailable: context.biometricsAvailable,

    // Methods
    signUp: context.signUp,
    signIn: context.signIn,
    signInWithBiometrics: context.signInWithBiometrics,
    signOut: context.signOut,
    resetPassword: context.resetPassword,
    setupBiometrics: context.setupBiometrics,
    disableBiometrics: context.disableBiometrics,
    refreshBiometricsState: context.refreshBiometricsState,
  };
}
