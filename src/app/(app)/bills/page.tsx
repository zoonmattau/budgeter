import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BillsTimeline } from '@/components/bills/bills-timeline'
import { BillsStats } from '@/components/bills/bills-stats'
import { formatCurrency } from '@/lib/utils'
import { endOfMonth, differenceInDays } from 'date-fns'

export default async function BillsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: bills } = await supabase
    .from('bills')
    .select('*, categories(*)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('next_due', { ascending: true })

  const today = new Date()
  const thisMonthEnd = endOfMonth(today)

  // Group bills by time period using rolling 7-day windows
  // (matches the dashboard summary logic)
  const overdueBills = bills?.filter(b => {
    const days = differenceInDays(new Date(b.next_due), today)
    return days < 0
  }) || []

  const thisWeekBills = bills?.filter(b => {
    const days = differenceInDays(new Date(b.next_due), today)
    return days >= 0 && days <= 7
  }) || []

  const nextWeekBills = bills?.filter(b => {
    const days = differenceInDays(new Date(b.next_due), today)
    return days > 7 && days <= 14
  }) || []

  const thisMonthBills = bills?.filter(b => {
    const due = new Date(b.next_due)
    const days = differenceInDays(due, today)
    return days > 14 && due <= thisMonthEnd
  }) || []

  const laterBills = bills?.filter(b => {
    const due = new Date(b.next_due)
    return due > thisMonthEnd
  }) || []

  const totalMonthly = bills?.reduce((sum, bill) => {
    if (bill.is_one_off) return sum
    const amount = Number(bill.amount)
    switch (bill.frequency) {
      case 'weekly': return sum + amount * 4.33
      case 'fortnightly': return sum + amount * 2.17
      case 'monthly': return sum + amount
      case 'quarterly': return sum + amount / 3
      case 'yearly': return sum + amount / 12
      default: return sum + amount
    }
  }, 0) || 0

  // Calculate totals by period
  const overdueTotal = overdueBills.reduce((sum, b) => sum + Number(b.amount), 0)
  const thisWeekTotal = thisWeekBills.reduce((sum, b) => sum + Number(b.amount), 0)
  const nextWeekTotal = nextWeekBills.reduce((sum, b) => sum + Number(b.amount), 0)
  const thisMonthTotal = thisMonthBills.reduce((sum, b) => sum + Number(b.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Bills</h1>
          <p className="text-gray-500 text-sm mt-1">
            {bills?.length || 0} active bill{bills?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/bills/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Bill
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card bg-gradient-to-br from-amber-50 to-coral-50">
          <p className="text-xs text-gray-600">Monthly Average</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalMonthly)}</p>
        </div>
        <div className={`card ${overdueTotal > 0 ? 'bg-gradient-to-br from-red-50 to-red-100' : 'bg-gradient-to-br from-sprout-50 to-bloom-50'}`}>
          <p className="text-xs text-gray-600">{overdueTotal > 0 ? 'Overdue' : 'Due This Week'}</p>
          <p className={`text-xl font-bold ${overdueTotal > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(overdueTotal > 0 ? overdueTotal : thisWeekTotal)}
          </p>
        </div>
      </div>

      {/* Bill Insights */}
      <BillsStats bills={bills || []} totalMonthly={totalMonthly} />

      {/* Upcoming Timeline */}
      <BillsTimeline
        overdue={overdueBills}
        thisWeek={thisWeekBills}
        nextWeek={nextWeekBills}
        thisMonth={thisMonthBills}
        later={laterBills}
        overdueTotal={overdueTotal}
        thisWeekTotal={thisWeekTotal}
        nextWeekTotal={nextWeekTotal}
        thisMonthTotal={thisMonthTotal}
      />
    </div>
  )
}
