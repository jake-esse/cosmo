/**
 * Re-export brand constants from shared workspace
 * Mobile can add platform-specific color overrides here if needed
 */
export { BRAND } from '@ampel/shared/constants/brand';

/**
 * Mobile-specific UI colors
 * These complement the brand colors for platform-specific needs
 */
export const UI_COLORS = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  border: '#E0E0E0',
  text: {
    primary: '#000000',
    secondary: '#666666',
    disabled: '#9E9E9E',
  },
  error: '#F44336',
  success: '#4CAF50',
  warning: '#FF9800',
} as const;
