/**
 * Brand constants for Ampel AI
 * Central location for all brand-related values
 */

export const BRAND = {
  name: 'Ampel',
  fullName: 'Ampel AI',
  tagline: 'The AI App Store',
  description: 'The first app store for consumer AI applications where users earn equity',
  domain: 'ampel.ai',
  
  // Company info
  company: {
    legal: 'Ampel AI Inc.',
    founded: 2025,
    location: 'San Francisco, CA',
  },
  
  // Social links (to be updated)
  social: {
    twitter: '@ampel_ai',
    github: 'ampel-ai',
    linkedin: 'ampel-ai',
  },
  
  // Color palette
  colors: {
    primary: '#1FB2CD', // Sky/Cyan
    background: '#FFFFFF',
    text: {
      primary: '#0F172A', // Slate-900
      secondary: '#334155', // Slate-700
      muted: '#94A3B8', // Slate-400
    },
    border: {
      light: '#F1F5F9', // Slate-100
      strong: '#E2E8F0', // Slate-200
    },
  },
  
  // Typography
  fonts: {
    ui: 'Inter',
    brand: 'Crimson Pro',
    mono: 'Inter',
  },
  
  // Equity system values
  equity: {
    signupBonus: 100,
    referralBonus: {
      referrer: 50,
      referred: 25,
    },
    premiumSubscription: 200,
  },
  
  // Feature flags
  features: {
    referrals: true,
    chat: true,
    equityWallet: true,
    dataControls: true,
    apps: true,
  },
} as const

export type Brand = typeof BRAND