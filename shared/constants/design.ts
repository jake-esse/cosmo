/**
 * Design System Constants
 * All values extracted from Figma design
 */

// Colors - Slate palette from Figma
export const colors = {
  slate: {
    900: '#0F172A',
    700: '#334155',
    400: '#94A3B8',
    300: '#CBD5E1',
    200: '#E2E8F0',
    100: '#F1F5F9',
    50: '#F8FAFC',
  },
  white: '#FFFFFF',
  black: '#000000',
  background: {
    primary: '#FFFFFF',
    chat: '#FDFDFD',
  }
} as const

// Typography - From Figma specifications
export const typography = {
  // Small text - DM Sans Medium 14px/14px
  small: {
    fontFamily: 'DM Sans',
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: '14px',
  },
  // Subtle medium - DM Sans Medium 14px/20px
  subtleMedium: {
    fontFamily: 'DM Sans',
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: '20px',
  },
  // Headline large - Crimson Text 36px/40px
  headlineLarge: {
    fontFamily: 'Crimson Text',
    fontSize: '36px',
    lineHeight: '40px',
    letterSpacing: '0',
  },
  // AI response text - Crimson Text Medium 24px
  aiResponse: {
    fontFamily: 'Crimson Text',
    fontSize: '24px',
    fontWeight: 500,
    lineHeight: '28px',
  },
  // Chat name - DM Sans Medium 16px/14px
  chatName: {
    fontFamily: 'DM Sans',
    fontSize: '16px',
    fontWeight: 500,
    lineHeight: '14px',
  }
} as const

// Shadows - From Figma
export const shadows = {
  sm: '0px 2px 4px 0px rgba(30, 41, 59, 0.25)',
  md: '0px 4px 6px 0px rgba(0, 0, 0, 0.09)',
  lg: '0px 0px 10px 0px rgba(0, 0, 0, 0.09)',
} as const

// Layout dimensions - From Figma
export const layout = {
  sidebar: {
    width: 224,
    height: '100vh',
  },
  chatWindow: {
    left: 241,
    top: 11,
    width: 1320,
    height: 988,
    borderRadius: 6,
  },
  chatContent: {
    maxWidth: 803,
    messageHeight: 134,
    inputBottom: 47,
    messagePadding: {
      left: 258,
      right: 258,
    }
  },
  avatar: {
    width: 28,
    height: 28,
  },
  icons: {
    small: 12,
    medium: 18,
    large: 24,
    xlarge: 35,
  }
} as const

// Border radius values
export const borderRadius = {
  default: '6px',
  small: '4px',
} as const

// Z-index layers
export const zIndex = {
  base: 0,
  dropdown: 10,
  overlay: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
} as const
