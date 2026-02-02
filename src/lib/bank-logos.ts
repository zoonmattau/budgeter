/**
 * Bank logo mapping with fuzzy matching for Australian banks
 */

interface BankInfo {
  name: string
  logo: string
  aliases: string[]
}

// Map of bank identifiers to their logo paths and aliases
export const BANK_LOGOS: Record<string, BankInfo> = {
  commbank: {
    name: 'Commonwealth Bank',
    logo: '/logos/commbank.svg',
    aliases: ['commonwealth', 'cba', 'comm bank', 'netbank'],
  },
  anz: {
    name: 'ANZ',
    logo: '/logos/anz.svg',
    aliases: ['anz bank', 'australia and new zealand'],
  },
  westpac: {
    name: 'Westpac',
    logo: '/logos/westpac.svg',
    aliases: ['westpac bank', 'westpac banking'],
  },
  nab: {
    name: 'NAB',
    logo: '/logos/nab.svg',
    aliases: ['national australia bank', 'nab bank'],
  },
  ing: {
    name: 'ING',
    logo: '/logos/ing.svg',
    aliases: ['ing direct', 'ing bank', 'ing australia'],
  },
  macquarie: {
    name: 'Macquarie',
    logo: '/logos/macquarie.svg',
    aliases: ['macquarie bank', 'macquarie group'],
  },
  bendigo: {
    name: 'Bendigo Bank',
    logo: '/logos/bendigo.svg',
    aliases: ['bendigo and adelaide', 'bendigo bank'],
  },
  suncorp: {
    name: 'Suncorp',
    logo: '/logos/suncorp.svg',
    aliases: ['suncorp bank', 'suncorp metway'],
  },
  bankwest: {
    name: 'Bankwest',
    logo: '/logos/bankwest.svg',
    aliases: ['bank west', 'bank of western australia'],
  },
  stgeorge: {
    name: 'St.George',
    logo: '/logos/stgeorge.svg',
    aliases: ['st george', 'saint george', 'stgeorge bank'],
  },
  bom: {
    name: 'Bank of Melbourne',
    logo: '/logos/bom.svg',
    aliases: ['bank of melbourne'],
  },
  banksa: {
    name: 'BankSA',
    logo: '/logos/banksa.svg',
    aliases: ['bank sa', 'bank of south australia'],
  },
  ubank: {
    name: 'UBank',
    logo: '/logos/ubank.svg',
    aliases: ['u bank', 'nab ubank'],
  },
  up: {
    name: 'Up',
    logo: '/logos/up.svg',
    aliases: ['up bank', 'up banking'],
  },
  '86400': {
    name: '86 400',
    logo: '/logos/86400.svg',
    aliases: ['86400 bank'],
  },
  hsbc: {
    name: 'HSBC',
    logo: '/logos/hsbc.svg',
    aliases: ['hsbc bank', 'hsbc australia'],
  },
  citibank: {
    name: 'Citibank',
    logo: '/logos/citibank.svg',
    aliases: ['citi', 'citi bank', 'citigroup'],
  },
  boq: {
    name: 'BOQ',
    logo: '/logos/boq.svg',
    aliases: ['bank of queensland', 'boq bank'],
  },
  mebank: {
    name: 'ME Bank',
    logo: '/logos/mebank.svg',
    aliases: ['me', 'members equity bank'],
  },
  anz_plus: {
    name: 'ANZ Plus',
    logo: '/logos/anz-plus.svg',
    aliases: ['anz plus', 'anz+'],
  },
}

/**
 * Normalize a string for matching (lowercase, remove special chars)
 */
function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Get bank logo path from institution name with fuzzy matching
 * @param institutionName The institution name to match
 * @returns Logo path or null if no match found
 */
export function getBankLogo(institutionName: string | null | undefined): string | null {
  if (!institutionName) return null

  const normalized = normalize(institutionName)

  // First, check for exact match on key
  if (BANK_LOGOS[normalized]) {
    return BANK_LOGOS[normalized].logo
  }

  // Check if the normalized input contains any bank key
  for (const [key, bank] of Object.entries(BANK_LOGOS)) {
    // Check key match
    if (normalized.includes(normalize(key))) {
      return bank.logo
    }

    // Check bank name match
    if (normalized.includes(normalize(bank.name))) {
      return bank.logo
    }

    // Check aliases
    for (const alias of bank.aliases) {
      if (normalized.includes(normalize(alias))) {
        return bank.logo
      }
    }
  }

  // Reverse check - see if any key/name/alias is contained in the input
  for (const [key, bank] of Object.entries(BANK_LOGOS)) {
    if (normalize(key).length >= 3 && normalized.includes(normalize(key))) {
      return bank.logo
    }
    if (normalize(bank.name).length >= 3 && normalized.includes(normalize(bank.name))) {
      return bank.logo
    }
  }

  return null
}

/**
 * Get bank info from institution name
 * @param institutionName The institution name to match
 * @returns Bank info or null if no match found
 */
export function getBankInfo(institutionName: string | null | undefined): BankInfo | null {
  if (!institutionName) return null

  const normalized = normalize(institutionName)

  // First, check for exact match on key
  if (BANK_LOGOS[normalized]) {
    return BANK_LOGOS[normalized]
  }

  // Check if the normalized input contains any bank key
  for (const [key, bank] of Object.entries(BANK_LOGOS)) {
    // Check key match
    if (normalized.includes(normalize(key))) {
      return bank
    }

    // Check bank name match
    if (normalized.includes(normalize(bank.name))) {
      return bank
    }

    // Check aliases
    for (const alias of bank.aliases) {
      if (normalized.includes(normalize(alias))) {
        return bank
      }
    }
  }

  return null
}
