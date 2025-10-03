/**
 * Persona API TypeScript Types
 * Based on Persona API v2023-01-05
 */

// Inquiry Status from Persona
export type PersonaInquiryStatus =
  | 'created'
  | 'pending'
  | 'completed'
  | 'approved'
  | 'declined'
  | 'needs_review'
  | 'expired'

// Account Type
export type PersonaAccountType = 'individual' | 'business'

// Base Persona Response Structure
export interface PersonaResponse<T> {
  data: T
  included?: unknown[]
  meta?: {
    'one-time-link'?: string
    [key: string]: unknown
  }
}

export interface PersonaListResponse<T> {
  data: T[]
  links?: {
    next?: string
    prev?: string
  }
  meta?: {
    [key: string]: unknown
  }
}

// Persona Account
export interface PersonaAccount {
  type: 'account'
  id: string
  attributes: {
    'reference-id'?: string
    'account-type': PersonaAccountType
    'created-at': string
    'updated-at': string
    tags?: string[]
  }
  relationships?: {
    inquiries?: {
      data: Array<{
        type: 'inquiry'
        id: string
      }>
    }
  }
}

// Persona Inquiry
export interface PersonaInquiry {
  type: 'inquiry'
  id: string
  attributes: {
    status: PersonaInquiryStatus
    'reference-id'?: string
    'created-at': string
    'updated-at': string
    'completed-at'?: string
    'started-at'?: string
    'failed-at'?: string
    'decisioned-at'?: string
    'expired-at'?: string
    'redacted-at'?: string
    'reviewer-comment'?: string
    tags?: string[]
    fields?: {
      [key: string]: {
        type: string
        value: unknown
      }
    }
  }
  relationships?: {
    account?: {
      data: {
        type: 'account'
        id: string
      } | null
    }
    template?: {
      data: {
        type: 'inquiry-template'
        id: string
      }
    }
    'inquiry-template-version'?: {
      data: {
        type: 'inquiry-template-version'
        id: string
      }
    }
  }
}

// Create Inquiry Request
export interface CreateInquiryRequest {
  data: {
    attributes: {
      'inquiry-template-id': string
      'reference-id'?: string
      'account-id'?: string
      fields?: {
        [key: string]: unknown
      }
      note?: string
    }
  }
}

// Create Inquiry Response
export type CreateInquiryResponse = PersonaResponse<PersonaInquiry>

// Get Inquiry Response
export type GetInquiryResponse = PersonaResponse<PersonaInquiry>

// List Accounts Response
export type ListAccountsResponse = PersonaListResponse<PersonaAccount>

// Resume Inquiry Request
export interface ResumeInquiryRequest {
  meta?: {
    'session-token-ttl'?: number
  }
}

// Resume Inquiry Response
export type ResumeInquiryResponse = PersonaResponse<PersonaInquiry>

// Generate One-Time Link Response
export interface GenerateOneTimeLinkResponse {
  data: PersonaInquiry
  meta: {
    'one-time-link': string
  }
}

// Inquiry Callback Query Params
export interface PersonaCallbackParams {
  'inquiry-id': string
  'reference-id'?: string
  status?: 'completed' | 'failed'
  fields?: string // JSON stringified object
}

// Device Types
export type DeviceType = 'mobile' | 'desktop' | 'unknown'

// KYC Session Status (internal)
export type KYCSessionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'expired'

// API Response Types for our endpoints

export interface InitiateKYCResponse {
  success: boolean
  deviceType: DeviceType
  sessionToken?: string  // For desktop
  qrUrl?: string          // For desktop
  verificationUrl?: string // For mobile (direct to Persona)
  error?: string
}

export interface KYCStatusResponse {
  success: boolean
  status: KYCSessionStatus
  completed: boolean
  inquiryId?: string
  error?: string
}

export interface MobileStartResponse {
  success: boolean
  redirectUrl?: string
  error?: string
}

export interface KYCCallbackResponse {
  success: boolean
  redirectUrl: string
  error?: string
}

// Webhook Event Types

export type PersonaWebhookEventName =
  // Inquiry events
  | 'inquiry.created'
  | 'inquiry.started'
  | 'inquiry.expired'
  | 'inquiry.completed'
  | 'inquiry.failed'
  | 'inquiry.marked-for-review'
  | 'inquiry.approved'
  | 'inquiry.declined'
  | 'inquiry.transitioned'
  // Account events
  | 'account.created'
  | 'account.redacted'
  | 'account.archived'
  | 'account.restored'
  | 'account.consolidated'
  | 'account.tag-added'
  | 'account.tag-removed'

// Webhook event payload structure
export interface PersonaWebhookEvent {
  data: {
    type: 'event'
    id: string
    attributes: {
      name: PersonaWebhookEventName
      payload: PersonaWebhookPayload
      'created-at': string
    }
  }
}

// Webhook payload (contains the actual inquiry or account data)
export interface PersonaWebhookPayload {
  data: PersonaInquiry | PersonaAccount
  included?: unknown[]
  meta?: Record<string, unknown>
}

// Webhook signature header structure
export interface PersonaSignature {
  timestamp: string
  signature: string
}
