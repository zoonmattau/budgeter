const INVITE_CODE_KEY = 'seedling_invite_code'
const INVITE_HOUSEHOLD_KEY = 'seedling_invite_household'

/**
 * Store an invite code in localStorage
 */
export function storeInviteCode(code: string, householdName?: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(INVITE_CODE_KEY, code)
  if (householdName) {
    localStorage.setItem(INVITE_HOUSEHOLD_KEY, householdName)
  }
}

/**
 * Get the stored invite code from localStorage
 */
export function getStoredInviteCode(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(INVITE_CODE_KEY)
}

/**
 * Get the stored household name for the invite
 */
export function getStoredInviteHouseholdName(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(INVITE_HOUSEHOLD_KEY)
}

/**
 * Clear the stored invite code and household name
 */
export function clearStoredInviteCode(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(INVITE_CODE_KEY)
  localStorage.removeItem(INVITE_HOUSEHOLD_KEY)
}
