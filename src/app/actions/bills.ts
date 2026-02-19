'use server'

import { createClient } from '@/lib/supabase/server'
import { addWeeks, addMonths, addQuarters, addYears, format } from 'date-fns'

function nextDueDate(currentDue: string, frequency: string): string {
  const date = new Date(currentDue + 'T00:00:00')
  switch (frequency) {
    case 'weekly':      return format(addWeeks(date, 1), 'yyyy-MM-dd')
    case 'fortnightly': return format(addWeeks(date, 2), 'yyyy-MM-dd')
    case 'monthly':     return format(addMonths(date, 1), 'yyyy-MM-dd')
    case 'quarterly':   return format(addQuarters(date, 1), 'yyyy-MM-dd')
    case 'yearly':      return format(addYears(date, 1), 'yyyy-MM-dd')
    default:            return format(addMonths(date, 1), 'yyyy-MM-dd')
  }
}

export async function markBillPaid(billId: string): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }

  const { data: bill } = await supabase
    .from('bills')
    .select('id, next_due, frequency, is_one_off, user_id')
    .eq('id', billId)
    .eq('user_id', user.id)
    .single()

  if (!bill) return { success: false }

  const today = format(new Date(), 'yyyy-MM-dd')

  if (bill.is_one_off) {
    // One-off bills: mark as inactive after paying
    await supabase
      .from('bills')
      .update({ is_active: false, last_paid_date: today })
      .eq('id', billId)
  } else {
    // Recurring: advance next_due to next cycle
    const next = nextDueDate(bill.next_due, bill.frequency)
    await supabase
      .from('bills')
      .update({ next_due: next, last_paid_date: today })
      .eq('id', billId)
  }

  return { success: true }
}
