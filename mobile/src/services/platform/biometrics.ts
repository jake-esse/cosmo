import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Biometrics Service
 * Handles all biometric authentication operations
 * Supports Face ID, Touch ID, and other platform biometrics
 */

export const biometricsService = {
  /**
   * Check if biometric authentication hardware is available
   * @returns true if biometrics hardware exists
   */
  async isAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      return hasHardware;
    } catch (error) {
      console.error('[Biometrics] Error checking availability:', error);
      return false;
    }
  },

  /**
   * Check if user has enrolled biometric credentials
   * @returns true if biometrics are enrolled (e.g., fingerprint or face registered)
   */
  async isEnrolled(): Promise<boolean> {
    try {
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return isEnrolled;
    } catch (error) {
      console.error('[Biometrics] Error checking enrollment:', error);
      return false;
    }
  },

  /**
   * Authenticate user with biometrics
   * @param reason - Explanation shown to user (e.g., "Sign in to Ampel")
   * @returns true if authentication succeeded
   */
  async authenticate(reason: string = 'Authenticate to continue'): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false, // Allow PIN/password fallback
        fallbackLabel: 'Use passcode',
      });

      return result.success;
    } catch (error) {
      console.error('[Biometrics] Authentication error:', error);
      return false;
    }
  },

  /**
   * Get list of supported biometric types on this device
   * @returns Array of supported types (e.g., [FINGERPRINT], [FACIAL_RECOGNITION])
   */
  async getSupportedTypes(): Promise<string[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return types.map((type) => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'FINGERPRINT';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'FACIAL_RECOGNITION';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'IRIS';
          default:
            return 'UNKNOWN';
        }
      });
    } catch (error) {
      console.error('[Biometrics] Error getting supported types:', error);
      return [];
    }
  },

  /**
   * Check if biometrics are fully available (hardware + enrollment)
   * Convenience method combining availability and enrollment checks
   * @returns true if biometrics can be used
   */
  async isReady(): Promise<boolean> {
    const available = await this.isAvailable();
    if (!available) return false;

    const enrolled = await this.isEnrolled();
    return enrolled;
  },

  /**
   * Get user-friendly name for biometric type
   * @returns Human-readable biometric name (e.g., "Face ID", "Touch ID")
   */
  async getBiometricName(): Promise<string> {
    const types = await this.getSupportedTypes();

    if (types.includes('FACIAL_RECOGNITION')) {
      return 'Face ID';
    }
    if (types.includes('FINGERPRINT')) {
      return 'Touch ID';
    }
    if (types.includes('IRIS')) {
      return 'Iris';
    }

    return 'Biometrics';
  },
};
