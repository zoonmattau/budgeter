import { createClient } from '@/lib/supabase/server'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const todayStr = format(today, 'yyyy-MM-dd')
  const monthStartStr = format(monthStart, 'yyyy-MM-dd')
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd')

  const [{ data: transactions }, { data: bills }] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, date, amount, type, description, categories(name, color, icon)')
      .eq('user_id', user.id)
      .is('household_id', null)
      .gte('date', monthStartStr)
      .lte('date', todayStr)
      .order('date', { ascending: true }),
    supabase
      .from('bills')
      .select('id, name, amount, next_due, frequency, categories(name, color, icon)')
      .eq('user_id', user.id)
      .is('household_id', null)
      .eq('is_active', true)
      .gte('next_due', monthStartStr)
      .lte('next_due', monthEndStr),
  ])

  // Group transactions and bills by date
  const txByDate = new Map<string, typeof transactions>()
  for (const t of transactions || []) {
    const existing = txByDate.get(t.date) || []
    existing.push(t)
    txByDate.set(t.date, existing)
  }

  const billsByDate = new Map<string, typeof bills>()
  for (const b of (bills || [])) {
    const existing = billsByDate.get(b.next_due) || []
    existing.push(b)
    billsByDate.set(b.next_due, existing)
  }

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  // Pad start with empty cells (Mon=0 ... Sun=6, but getDay gives Sun=0)
  const firstDayOfWeek = (getDay(monthStart) + 6) % 7 // Convert to Mon-based
  const paddingDays = firstDayOfWeek

  const totalSpent = (transactions || []).filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const totalIncome = (transactions || []).filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">{format(today, 'MMMM yyyy')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Spending calendar</p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card py-3 text-center">
          <p className="text-xs text-gray-500">Spent</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-xs text-gray-500">Income</p>
          <p className="text-xl font-bold text-sprout-600">{formatCurrency(totalIncome)}</p>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card p-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {/* Padding */}
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}

          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayTx = txByDate.get(dateStr) || []
            const dayBills = billsByDate.get(dateStr) || []
            const isToday = dateStr === todayStr
            const isFuture = dateStr > todayStr
            const dayExpenses = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
            const dayIncome = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
            const hasBills = dayBills.length > 0

            return (
              <div
                key={dateStr}
                className={`relative p-1 rounded-lg min-h-[52px] flex flex-col ${
                  isToday
                    ? 'bg-bloom-50 ring-1 ring-bloom-300'
                    : isFuture
                      ? 'opacity-40'
                      : dayExpenses > 0 || dayIncome > 0
                        ? 'bg-gray-50'
                        : ''
                }`}
              >
                <span className={`text-[10px] font-semibold ${isToday ? 'text-bloom-600' : 'text-gray-500'}`}>
                  {format(day, 'd')}
                </span>

                {dayExpenses > 0 && (
                  <span className="text-[9px] font-medium text-coral-500 leading-tight">
                    -{formatCurrency(dayExpenses)}
                  </span>
                )}
                {dayIncome > 0 && (
                  <span className="text-[9px] font-medium text-sprout-600 leading-tight">
                    +{formatCurrency(dayIncome)}
                  </span>
                )}

                {hasBills && (
                  <div className="absolute bottom-1 right-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`${dayBills.length} bill${dayBills.length > 1 ? 's' : ''} due`} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <div className="w-2 h-2 rounded-full bg-coral-400" />
            Expense
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <div className="w-2 h-2 rounded-full bg-sprout-400" />
            Income
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            Bill due
          </div>
        </div>
      </div>

      {/* Bills due this month */}
      {(bills || []).length > 0 && (
        <div>
          <h2 className="font-display font-semibold text-gray-900 mb-3">Bills this month</h2>
          <div className="space-y-2">
            {(bills || []).map(bill => {
              const isPast = bill.next_due <= todayStr
              return (
                <div key={bill.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isPast ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{bill.name}</p>
                    <p className={`text-xs ${isPast ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                      {isPast ? 'Overdue — ' : ''}{format(new Date(bill.next_due + 'T00:00:00'), 'EEE, MMM d')}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(bill.amount))}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
