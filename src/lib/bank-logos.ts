/**
 * Bank logo utilities
 *
 * Note: We now use Clearbit Logo API for real logos instead of local SVGs.
 * These functions are kept for backwards compatibility but return null,
 * allowing the AccountLogo component to fall back to Clearbit.
 */

interface BankInfo {
  name: string
  logo: string | null
  aliases: string[]
}

/**
 * Get bank logo path from institution name
 * @param institutionName The institution name to match
 * @returns Always returns null - use Clearbit via AccountLogo component
 */
export function getBankLogo(_institutionName: string | null | undefined): string | null {
  // Local logos removed - using Clearbit API instead
  return null
}

/**
 * Get bank info from institution name
 * @param institutionName The institution name to match
 * @returns Bank info or null if no match found
 */
export function getBankInfo(_institutionName: string | null | undefined): BankInfo | null {
  // Local logos removed - using Clearbit API instead
  return null
}
