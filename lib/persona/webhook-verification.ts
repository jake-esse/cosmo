/**
 * Persona Webhook Signature Verification
 * Implements HMAC-SHA256 verification for Persona webhooks
 */

import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import type { PersonaSignature } from '@/types/persona'

const TIMESTAMP_TOLERANCE_SECONDS = 300 // 5 minutes

/**
 * Parse the Persona-Signature header
 * Format: "t=1234567890,v1=abc123..."
 * During secret rotation, may contain multiple signatures: "t=...,v1=...,v1=..."
 */
export function parsePersonaSignature(header: string): PersonaSignature[] {
  const pairs = header.split(',').map(p => p.trim())
  const timestamp = pairs.find(p => p.startsWith('t='))?.split('=')[1]

  if (!timestamp) {
    throw new Error('Invalid Persona-Signature header: missing timestamp')
  }

  const signatures = pairs
    .filter(p => p.startsWith('v1='))
    .map(p => p.split('=')[1])

  if (signatures.length === 0) {
    throw new Error('Invalid Persona-Signature header: missing signature')
  }

  // Return array of signatures (for secret rotation support)
  return signatures.map(signature => ({
    timestamp,
    signature,
  }))
}

/**
 * Compute HMAC-SHA256 signature for webhook verification
 * Message format: "{timestamp}.{request_body}"
 */
export function computeSignature(
  secret: string,
  timestamp: string,
  body: string
): string {
  const message = `${timestamp}.${body}`
  return createHmac('sha256', secret)
    .update(message, 'utf8')
    .digest('hex')
}

/**
 * Verify webhook signature using timing-safe comparison
 */
export function verifySignature(
  computed: string,
  provided: string
): boolean {
  try {
    // Convert hex strings to buffers for timing-safe comparison
    const computedBuffer = Buffer.from(computed, 'hex')
    const providedBuffer = Buffer.from(provided, 'hex')

    // Lengths must match for timingSafeEqual
    if (computedBuffer.length !== providedBuffer.length) {
      return false
    }

    return timingSafeEqual(computedBuffer, providedBuffer)
  } catch {
    return false
  }
}

/**
 * Validate timestamp to prevent replay attacks
 * Rejects requests older than TIMESTAMP_TOLERANCE_SECONDS
 */
export function validateTimestamp(timestamp: string): boolean {
  const webhookTime = parseInt(timestamp, 10)

  if (isNaN(webhookTime)) {
    return false
  }

  const now = Math.floor(Date.now() / 1000)
  const diff = Math.abs(now - webhookTime)

  return diff <= TIMESTAMP_TOLERANCE_SECONDS
}

/**
 * Verify Persona webhook signature
 *
 * @param rawBody - Raw request body as string (not parsed JSON)
 * @param signatureHeader - Value of Persona-Signature header
 * @param secret - Webhook secret from Persona Dashboard
 * @returns true if signature is valid and timestamp is recent
 * @throws Error if signature header is malformed
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  // Parse signature header (may contain multiple signatures during rotation)
  const signatures = parsePersonaSignature(signatureHeader)

  // Validate timestamp (same for all signatures)
  const { timestamp } = signatures[0]
  if (!validateTimestamp(timestamp)) {
    console.warn('Webhook timestamp outside tolerance window')
    return false
  }

  // Compute expected signature
  const computedSignature = computeSignature(secret, timestamp, rawBody)

  // Check if any provided signature matches (supports secret rotation)
  const isValid = signatures.some(({ signature }) =>
    verifySignature(computedSignature, signature)
  )

  if (!isValid) {
    console.warn('Webhook signature verification failed')
  }

  return isValid
}
