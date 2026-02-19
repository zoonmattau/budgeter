'use server'

import { createClient } from '@/lib/supabase/server'
import { format, startOfMonth } from 'date-fns'
import { awardXP } from './gamification'

export async function logPaydayIncome(
  userId: string,
  entries: { source: string; amount: number }[],
): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  // Clear any existing payday entries for these sources this month to avoid duplicates
  await supabase
    .from('income_entries')
    .delete()
    .eq('user_id', userId)
    .eq('month', currentMonth)
    .is('household_id', null)
    .in('source', entries.map(e => e.source))

  // Log income for the current month
  await supabase.from('income_entries').insert(
    entries.map(e => ({
      user_id: userId,
      month: currentMonth,
      source: e.source,
      amount: e.amount,
      is_recurring: false,
    }))
  )

  await awardXP(userId, 25)

  return { success: true }
}
