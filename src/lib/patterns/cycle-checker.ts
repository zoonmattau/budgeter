import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { normalizeDescription, calculateSimilarity } from './matcher'

type PaymentPattern = Database['public']['Tables']['payment_patterns']['Row']

/**
 * Calculate the billing cycle window for a pattern
 * Returns start and end dates for the current cycle
 */
export function calculateBillingCycle(
  pattern: Pick<PaymentPattern, 'frequency' | 'typical_day' | 'day_variance'>
): { start: Date; end: Date } {
  const now = new Date()
  const typicalDay = pattern.typical_day
  const variance = pattern.day_variance || 3

  let cycleStart: Date
  let cycleEnd: Date

  switch (pattern.frequency) {
    case 'weekly': {
      // Weekly cycle: 7 days back from today
      cycleStart = new Date(now)
      cycleStart.setDate(now.getDate() - 7)
      cycleEnd = new Date(now)
      cycleEnd.setDate(now.getDate() + 1)
      break
    }
    case 'fortnightly': {
      // Fortnightly cycle: 14 days back from today
      cycleStart = new Date(now)
      cycleStart.setDate(now.getDate() - 14)
      cycleEnd = new Date(now)
      cycleEnd.setDate(now.getDate() + 1)
      break
    }
    case 'monthly': {
      // Monthly cycle: from (typical_day - variance) of current/previous month
      // to (typical_day + variance) of current month
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      // Start of cycle window (accounting for variance)
      const startDay = Math.max(1, typicalDay - variance)
      cycleStart = new Date(currentYear, currentMonth, startDay)

      // If we're before the expected window, look at previous month
      if (now.getDate() < startDay) {
        cycleStart.setMonth(cycleStart.getMonth() - 1)
      }

      // End of cycle is typical_day + variance (or end of month)
      const endDay = Math.min(31, typicalDay + variance)
      cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth(), endDay)
      cycleEnd.setDate(cycleEnd.getDate() + 1) // Include the end day
      break
    }
    case 'quarterly': {
      // Quarterly: 3 months back from typical_day
      cycleStart = new Date(now.getFullYear(), now.getMonth() - 3, typicalDay - variance)
      cycleEnd = new Date(now.getFullYear(), now.getMonth(), typicalDay + variance + 1)
      break
    }
    case 'yearly': {
      // Yearly: from 30 days before typical occurrence to current date
      cycleStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      cycleEnd = new Date(now)
      cycleEnd.setDate(cycleEnd.getDate() + 1)
      break
    }
    default:
      cycleStart = new Date(now.getFullYear(), now.getMonth(), 1)
      cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  }

  return { start: cycleStart, end: cycleEnd }
}

/**
 * Check if a payment has already been made this billing cycle
 */
export async function checkIfPaidThisCycle(
  supabase: SupabaseClient<Database>,
  pattern: PaymentPattern,
  userId: string
): Promise<{ paid: boolean; transaction?: { id: string; date: string; amount: number } }> {
  const { start, end } = calculateBillingCycle(pattern)

  // Query transactions in this cycle window
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, description, amount, date')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('date', start.toISOString().split('T')[0])
    .lte('date', end.toISOString().split('T')[0])

  if (!transactions || transactions.length === 0) {
    return { paid: false }
  }

  // Find a matching transaction
  for (const tx of transactions) {
    const similarity = calculateSimilarity(tx.description, pattern.normalized_name)
    const amountDiff = Math.abs(tx.amount - Number(pattern.typical_amount))
    const amountTolerance = Number(pattern.amount_variance) || Number(pattern.typical_amount) * 0.1

    // Match if description is similar and amount is within tolerance
    if (similarity >= 0.5 && amountDiff <= amountTolerance) {
      return {
        paid: true,
        transaction: {
          id: tx.id,
          date: tx.date,
          amount: tx.amount
        }
      }
    }
  }

  return { paid: false }
}

/**
 * Auto-match pending predictions with recent transactions
 */
export async function autoMatchPredictions(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  // Get pending predictions
  const { data: predictions } = await supabase
    .from('pattern_predictions')
    .select('*, payment_patterns(*)')
    .eq('user_id', userId)
    .eq('status', 'pending')

  if (!predictions || predictions.length === 0) {
    return 0
  }

  // Get recent transactions (last 14 days)
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, description, amount, date')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('date', twoWeeksAgo.toISOString().split('T')[0])

  if (!transactions || transactions.length === 0) {
    return 0
  }

  let matchedCount = 0

  for (const prediction of predictions) {
    const pattern = prediction.payment_patterns
    if (!pattern) continue

    const predDate = new Date(prediction.predicted_date)
    const variance = pattern.day_variance || 3

    // Find matching transaction within the variance window
    for (const tx of transactions) {
      const txDate = new Date(tx.date)
      const daysDiff = Math.abs(Math.floor((txDate.getTime() - predDate.getTime()) / (1000 * 60 * 60 * 24)))

      if (daysDiff > variance) continue

      const similarity = calculateSimilarity(tx.description, pattern.normalized_name)
      const amountDiff = Math.abs(tx.amount - Number(prediction.predicted_amount))
      const amountTolerance = Number(pattern.amount_variance) || Number(prediction.predicted_amount) * 0.15

      if (similarity >= 0.5 && amountDiff <= amountTolerance) {
        // Match found - update prediction
        await supabase
          .from('pattern_predictions')
          .update({
            status: 'matched',
            matched_transaction_id: tx.id,
            resolved_at: new Date().toISOString()
          })
          .eq('id', prediction.id)

        // Increase pattern confidence
        const newConfidence = Math.min(0.99, Number(pattern.confidence) + 0.05)
        await supabase
          .from('payment_patterns')
          .update({
            confidence: newConfidence,
            last_occurrence: tx.date,
            occurrence_count: (pattern.occurrence_count || 1) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', pattern.id)

        matchedCount++
        break
      }
    }
  }

  return matchedCount
}
