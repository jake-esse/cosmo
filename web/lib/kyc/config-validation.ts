/**
 * KYC Environment Variable Validation
 * Validates critical env vars on startup to fail fast
 */

const REQUIRED_KYC_ENV_VARS = [
  'PERSONA_API_KEY',
  'PERSONA_TEMPLATE_ID',
  'PERSONA_WEBHOOK_SECRET',
  'NEXT_PUBLIC_APP_URL',
] as const

/**
 * Validate KYC environment variables on startup
 * Only logs errors in development, throws in production
 */
export function validateKYCConfig() {
  const missing: string[] = []

  for (const envVar of REQUIRED_KYC_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }

  if (missing.length > 0) {
    const errorMessage = `❌ Missing required KYC env vars: ${missing.join(', ')}`

    console.error('[KYC Config]', {
      message: errorMessage,
      missingVars: missing,
      timestamp: new Date().toISOString(),
    })

    // In production, throw error to prevent deployment with missing config
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMessage)
    }
  } else {
    console.log('✅ KYC environment variables validated')
  }
}

// Run validation on import (only server-side)
if (typeof window === 'undefined') {
  validateKYCConfig()
}
