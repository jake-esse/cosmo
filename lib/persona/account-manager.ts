/**
 * Persona Account Manager
 * Handles account lifecycle, duplicate detection, and user linking
 */

import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { personaApi } from '@/lib/persona/client'
import type { PersonaAccount, PersonaInquiry } from '@/types/persona'

/**
 * Error types for account management
 */
export class DuplicateAccountError extends Error {
  constructor(
    message: string,
    public accountId: string,
    public existingUserId?: string
  ) {
    super(message)
    this.name = 'DuplicateAccountError'
  }
}

export class AccountNotFoundError extends Error {
  constructor(message: string, public inquiryId?: string) {
    super(message)
    this.name = 'AccountNotFoundError'
  }
}

/**
 * Check if a Persona Account is already linked to a user in our database
 * @param accountId - Persona Account ID
 * @returns User ID if account is linked, null otherwise
 */
export async function checkAccountLinked(
  accountId: string
): Promise<string | null> {
  const adminSupabase = createAdminClient()

  const { data, error } = await adminSupabase
    .from('persona_accounts')
    .select('user_id')
    .eq('persona_account_id', accountId)
    .maybeSingle()

  if (error) {
    console.error('Error checking account linkage:', error)
    throw error
  }

  return data?.user_id || null
}

/**
 * Check if user already has a Persona Account
 * @param userId - User ID
 * @returns Persona Account ID if exists, null otherwise
 */
export async function checkUserHasAccount(
  userId: string
): Promise<string | null> {
  const adminSupabase = createAdminClient()

  const { data, error } = await adminSupabase
    .from('persona_accounts')
    .select('persona_account_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('Error checking user account:', error)
    throw error
  }

  return data?.persona_account_id || null
}

/**
 * Check for duplicate account by inquiry ID
 * Fetches inquiry from Persona API and checks if associated account is already linked
 *
 * @param inquiryId - Persona Inquiry ID
 * @returns Object with duplicate status and details
 */
export async function checkDuplicateByInquiryId(
  inquiryId: string
): Promise<{
  isDuplicate: boolean
  accountId?: string
  existingUserId?: string
  inquiry?: PersonaInquiry
}> {
  try {
    // Fetch inquiry from Persona
    const inquiry = await personaApi.getInquiry(inquiryId)

    // Check if inquiry has associated account
    const accountId = inquiry.relationships?.account?.data?.id

    if (!accountId) {
      return { isDuplicate: false, inquiry }
    }

    // Check if account is already linked to a user
    const existingUserId = await checkAccountLinked(accountId)

    if (existingUserId) {
      return {
        isDuplicate: true,
        accountId,
        existingUserId,
        inquiry,
      }
    }

    return { isDuplicate: false, accountId, inquiry }
  } catch (error) {
    console.error('Error checking duplicate by inquiry:', error)
    throw error
  }
}

/**
 * Check for duplicate account by reference ID
 * Searches Persona for accounts with this reference ID
 *
 * @param referenceId - Reference ID (typically user.id)
 * @returns Object with duplicate status and details
 */
export async function checkDuplicateByReferenceId(
  referenceId: string
): Promise<{
  isDuplicate: boolean
  account?: PersonaAccount
  isLinkedToDifferentUser?: boolean
}> {
  try {
    // Search Persona for accounts with this reference-id
    const account = await personaApi.searchAccounts(referenceId)

    if (!account) {
      return { isDuplicate: false }
    }

    // Check if this account is linked to a different user in our database
    const linkedUserId = await checkAccountLinked(account.id)

    // If account exists in Persona but not linked in our DB, it's a partial state
    // If it's linked to a different user, it's a true duplicate
    if (linkedUserId && linkedUserId !== referenceId) {
      return {
        isDuplicate: true,
        account,
        isLinkedToDifferentUser: true,
      }
    }

    return {
      isDuplicate: !!linkedUserId,
      account,
      isLinkedToDifferentUser: false,
    }
  } catch (error) {
    console.error('Error checking duplicate by reference ID:', error)
    throw error
  }
}

/**
 * Link a Persona Account to a user
 * Creates record in persona_accounts table with duplicate prevention
 *
 * @param accountId - Persona Account ID
 * @param userId - User ID
 * @throws DuplicateAccountError if account is already linked
 */
export async function linkAccountToUser(
  accountId: string,
  userId: string
): Promise<void> {
  const adminSupabase = createAdminClient()

  // Check if account is already linked
  const existingUserId = await checkAccountLinked(accountId)

  if (existingUserId && existingUserId !== userId) {
    throw new DuplicateAccountError(
      `Account ${accountId} is already linked to user ${existingUserId}`,
      accountId,
      existingUserId
    )
  }

  // Check if user already has a different account
  const existingAccountId = await checkUserHasAccount(userId)

  if (existingAccountId && existingAccountId !== accountId) {
    throw new DuplicateAccountError(
      `User ${userId} already has account ${existingAccountId}`,
      existingAccountId,
      userId
    )
  }

  // Create or update the linkage
  const { error } = await adminSupabase
    .from('persona_accounts')
    .upsert(
      {
        user_id: userId,
        persona_account_id: accountId,
      },
      {
        onConflict: 'user_id',
      }
    )

  if (error) {
    console.error('Error linking account to user:', error)
    throw error
  }

  console.log(`Successfully linked account ${accountId} to user ${userId}`)
}

/**
 * Handle account consolidation event from Persona
 * When accounts are merged, update our records accordingly
 *
 * @param primaryAccountId - The primary (surviving) account ID
 * @param secondaryAccountId - The secondary (merged) account ID
 */
export async function handleAccountConsolidation(
  primaryAccountId: string,
  secondaryAccountId: string
): Promise<void> {
  const adminSupabase = createAdminClient()

  console.log(
    `Handling account consolidation: ${secondaryAccountId} -> ${primaryAccountId}`
  )

  // Check if secondary account was linked to any user
  const secondaryUserId = await checkAccountLinked(secondaryAccountId)

  if (!secondaryUserId) {
    console.log('Secondary account was not linked to any user')
    return
  }

  // Update the user's linked account to the primary account
  const { error } = await adminSupabase
    .from('persona_accounts')
    .update({ persona_account_id: primaryAccountId })
    .eq('user_id', secondaryUserId)

  if (error) {
    console.error('Error updating consolidated account:', error)
    throw error
  }

  console.log(
    `Updated user ${secondaryUserId} account from ${secondaryAccountId} to ${primaryAccountId}`
  )
}
