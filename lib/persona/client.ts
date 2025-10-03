/**
 * Persona API Client
 * Handles all interactions with Persona's identity verification API
 */

import 'server-only'
import type {
  CreateInquiryRequest,
  CreateInquiryResponse,
  GetInquiryResponse,
  ListAccountsResponse,
  ResumeInquiryResponse,
  GenerateOneTimeLinkResponse,
  PersonaAccount,
  PersonaInquiry,
} from '@/types/persona'

const PERSONA_API_BASE = 'https://api.withpersona.com/api/v1'
const PERSONA_API_VERSION = '2023-01-05'

class PersonaClient {
  private apiKey: string

  constructor() {
    const apiKey = process.env.PERSONA_API_KEY

    if (!apiKey) {
      throw new Error('PERSONA_API_KEY environment variable is required')
    }

    this.apiKey = apiKey
  }

  /**
   * Common fetch wrapper with authentication and error handling
   */
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${PERSONA_API_BASE}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Persona-Version': PERSONA_API_VERSION,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Persona API error (${response.status}): ${errorText}`
      )
    }

    return response.json()
  }

  /**
   * Search for accounts by reference ID
   * Used to check for duplicate accounts before creating inquiry
   */
  async searchAccounts(
    referenceId: string
  ): Promise<PersonaAccount | null> {
    try {
      const response = await this.fetch<ListAccountsResponse>(
        `/accounts?filter[reference-id]=${encodeURIComponent(referenceId)}`
      )

      // Return first matching account or null
      return response.data.length > 0 ? response.data[0] : null
    } catch (error) {
      console.error('Error searching Persona accounts:', error)
      throw error
    }
  }

  /**
   * Create a new inquiry
   * @param templateId - Persona inquiry template ID
   * @param referenceId - Unique identifier for the user (user.id)
   * @param fields - Optional pre-filled fields
   */
  async createInquiry(
    templateId: string,
    referenceId: string,
    fields?: Record<string, unknown>
  ): Promise<PersonaInquiry> {
    try {
      const requestBody: CreateInquiryRequest = {
        data: {
          attributes: {
            'inquiry-template-id': templateId,
            'reference-id': referenceId,
            ...(fields && { fields }),
          },
        },
      }

      const response = await this.fetch<CreateInquiryResponse>(
        '/inquiries',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }
      )

      return response.data
    } catch (error) {
      console.error('Error creating Persona inquiry:', error)
      throw error
    }
  }

  /**
   * Generate a one-time link for an inquiry
   * Used for mobile flows and QR codes
   * @param inquiryId - The inquiry ID
   */
  async generateOneTimeLink(
    inquiryId: string
  ): Promise<string> {
    try {
      const response = await this.fetch<GenerateOneTimeLinkResponse>(
        `/inquiries/${inquiryId}/generate-one-time-link`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      )

      if (!response.meta?.['one-time-link']) {
        throw new Error('One-time link not returned from Persona API')
      }

      return response.meta['one-time-link']
    } catch (error) {
      console.error('Error generating one-time link:', error)
      throw error
    }
  }

  /**
   * Build a hosted flow URL with redirect URIs
   * This constructs the URL manually for cases where we need custom redirect handling
   */
  buildHostedFlowUrl(
    oneTimeLink: string,
    redirectUri?: string
  ): string {
    const url = new URL(oneTimeLink)

    if (redirectUri) {
      url.searchParams.set('redirect-uri', redirectUri)
    }

    return url.toString()
  }

  /**
   * Get inquiry details
   * @param inquiryId - The inquiry ID
   */
  async getInquiry(inquiryId: string): Promise<PersonaInquiry> {
    try {
      const response = await this.fetch<GetInquiryResponse>(
        `/inquiries/${inquiryId}`
      )

      return response.data
    } catch (error) {
      console.error('Error fetching Persona inquiry:', error)
      throw error
    }
  }

  /**
   * Resume an inquiry that was previously started
   * Useful for retry flows
   * @param inquiryId - The inquiry ID to resume
   */
  async resumeInquiry(inquiryId: string): Promise<PersonaInquiry> {
    try {
      const response = await this.fetch<ResumeInquiryResponse>(
        `/inquiries/${inquiryId}/resume`,
        {
          method: 'POST',
          body: JSON.stringify({
            meta: {
              'session-token-ttl': 86400, // 24 hours
            },
          }),
        }
      )

      return response.data
    } catch (error) {
      console.error('Error resuming Persona inquiry:', error)
      throw error
    }
  }

  /**
   * Create an inquiry and immediately generate a one-time link
   * Convenience method for mobile flows
   */
  async createInquiryWithLink(
    templateId: string,
    referenceId: string,
    redirectUri?: string,
    fields?: Record<string, unknown>
  ): Promise<{ inquiry: PersonaInquiry; url: string }> {
    const inquiry = await this.createInquiry(templateId, referenceId, fields)
    const oneTimeLink = await this.generateOneTimeLink(inquiry.id)
    const url = this.buildHostedFlowUrl(oneTimeLink, redirectUri)

    return { inquiry, url }
  }
}

// Singleton instance
let personaClient: PersonaClient | null = null

/**
 * Get the Persona API client instance
 */
export function getPersonaClient(): PersonaClient {
  if (!personaClient) {
    personaClient = new PersonaClient()
  }
  return personaClient
}

/**
 * Export individual methods for convenience
 */
export const personaApi = {
  searchAccounts: (referenceId: string) =>
    getPersonaClient().searchAccounts(referenceId),

  createInquiry: (
    templateId: string,
    referenceId: string,
    fields?: Record<string, unknown>
  ) => getPersonaClient().createInquiry(templateId, referenceId, fields),

  generateOneTimeLink: (inquiryId: string) =>
    getPersonaClient().generateOneTimeLink(inquiryId),

  buildHostedFlowUrl: (oneTimeLink: string, redirectUri?: string) =>
    getPersonaClient().buildHostedFlowUrl(oneTimeLink, redirectUri),

  getInquiry: (inquiryId: string) =>
    getPersonaClient().getInquiry(inquiryId),

  resumeInquiry: (inquiryId: string) =>
    getPersonaClient().resumeInquiry(inquiryId),

  createInquiryWithLink: (
    templateId: string,
    referenceId: string,
    redirectUri?: string,
    fields?: Record<string, unknown>
  ) =>
    getPersonaClient().createInquiryWithLink(
      templateId,
      referenceId,
      redirectUri,
      fields
    ),
}
