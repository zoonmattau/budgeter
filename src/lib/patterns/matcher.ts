/**
 * Pattern matching utilities for transaction analysis
 */

/**
 * Normalize a transaction description for matching
 * - Lowercase
 * - Remove extra whitespace
 * - Remove common transaction noise (dates, reference numbers, etc.)
 */
export function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\d{2}\/\d{2}\/\d{2,4}/g, '') // Remove dates like 01/15/2024
    .replace(/\d{2}-\d{2}-\d{2,4}/g, '') // Remove dates like 01-15-2024
    .replace(/ref[:\s]?\w+/gi, '') // Remove reference numbers
    .replace(/txn[:\s]?\w+/gi, '') // Remove transaction IDs
    .replace(/\*+\d+/g, '') // Remove masked card numbers like ***1234
    .replace(/[#*]+/g, '') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calculate similarity between two strings using token-based matching
 * Returns a score from 0 to 1
 */
export function calculateSimilarity(a: string, b: string): number {
  const tokensA = normalizeDescription(a).split(' ').filter(t => t.length > 2)
  const tokensB = normalizeDescription(b).split(' ').filter(t => t.length > 2)

  if (tokensA.length === 0 || tokensB.length === 0) return 0

  const setA = new Set(tokensA)
  const setB = new Set(tokensB)

  let matches = 0
  for (const token of setA) {
    if (setB.has(token)) matches++
  }

  // Jaccard similarity
  const union = new Set([...tokensA, ...tokensB])
  return matches / union.size
}

/**
 * Match a transaction to the best matching pattern
 * Returns the pattern and match score, or null if no good match
 */
export function matchTransactionToPattern<T extends { normalized_name: string; typical_amount: number }>(
  txDescription: string,
  txAmount: number,
  patterns: T[],
  minSimilarity = 0.6
): { pattern: T; score: number } | null {
  let bestMatch: { pattern: T; score: number } | null = null

  const normalizedTx = normalizeDescription(txDescription)

  for (const pattern of patterns) {
    const nameSimilarity = calculateSimilarity(normalizedTx, pattern.normalized_name)

    // Amount similarity (within 20% is considered similar)
    const amountDiff = Math.abs(txAmount - pattern.typical_amount)
    const amountSimilarity = Math.max(0, 1 - (amountDiff / pattern.typical_amount) * 2)

    // Combined score (name matters more)
    const score = nameSimilarity * 0.7 + amountSimilarity * 0.3

    if (score >= minSimilarity && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { pattern, score }
    }
  }

  return bestMatch
}

/**
 * Calculate the typical day and variance from a set of dates
 */
export function calculateDayPattern(dates: Date[]): { typicalDay: number; variance: number } {
  if (dates.length === 0) {
    return { typicalDay: 15, variance: 7 }
  }

  const days = dates.map(d => d.getDate())

  // Calculate mean day
  const sum = days.reduce((a, b) => a + b, 0)
  const typicalDay = Math.round(sum / days.length)

  // Calculate variance (standard deviation)
  if (days.length === 1) {
    return { typicalDay, variance: 3 }
  }

  const squaredDiffs = days.map(d => Math.pow(d - typicalDay, 2))
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / days.length
  const variance = Math.round(Math.sqrt(avgSquaredDiff))

  return { typicalDay, variance: Math.max(1, Math.min(variance, 7)) }
}

/**
 * Calculate the next expected date for a pattern
 */
export function calculateNextExpected(
  frequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly',
  typicalDay: number,
  lastOccurrence?: Date
): Date {
  const now = new Date()
  const today = now.getDate()
  let nextDate: Date

  switch (frequency) {
    case 'weekly': {
      // Next occurrence is within 7 days
      nextDate = new Date(now)
      nextDate.setDate(today + 7)
      break
    }
    case 'fortnightly': {
      // Next occurrence is within 14 days
      nextDate = new Date(now)
      nextDate.setDate(today + 14)
      break
    }
    case 'monthly': {
      nextDate = new Date(now.getFullYear(), now.getMonth(), typicalDay)
      // If the day has passed this month, move to next month
      if (nextDate <= now) {
        nextDate.setMonth(nextDate.getMonth() + 1)
      }
      // Handle months with fewer days
      const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()
      if (typicalDay > lastDayOfMonth) {
        nextDate.setDate(lastDayOfMonth)
      }
      break
    }
    case 'quarterly': {
      nextDate = new Date(now.getFullYear(), now.getMonth(), typicalDay)
      if (nextDate <= now) {
        nextDate.setMonth(nextDate.getMonth() + 3)
      }
      break
    }
    case 'yearly': {
      if (lastOccurrence) {
        nextDate = new Date(lastOccurrence)
        nextDate.setFullYear(nextDate.getFullYear() + 1)
        if (nextDate <= now) {
          nextDate.setFullYear(nextDate.getFullYear() + 1)
        }
      } else {
        nextDate = new Date(now.getFullYear(), now.getMonth(), typicalDay)
        if (nextDate <= now) {
          nextDate.setFullYear(nextDate.getFullYear() + 1)
        }
      }
      break
    }
    default:
      nextDate = new Date(now.getFullYear(), now.getMonth(), typicalDay)
  }

  return nextDate
}
