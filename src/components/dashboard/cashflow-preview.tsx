'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { format, parseISO, isToday, isTomorrow, isYesterday, addDays, subDays, startOfDay, isBefore } from 'date-fns'
import { ArrowRight, ArrowUpCircle, ArrowDownCircle, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { IncomeEntry, Bill } from '@/lib/timeline-calculator'

interface Transaction {
  id: string
  amount: number
  date: string
  type: string
  description: string
}

interface CashflowPreviewProps {
  accounts: unknown[]
  incomeEntries: IncomeEntry[]
  bills: Bill[]
  transactions?: Transaction[]
}

interface DayEvents {
  date: string
  events: { type: 'income' | 'bill' | 'expense'; name: string; amount: number }[]
}

function formatDayLabel(dateStr: string): { day: string; date: string } {
  const date = parseISO(dateStr)
  if (isToday(date)) return { day: 'Today', date: format(date, 'd') }
  if (isTomorrow(date)) return { day: 'Tomorrow', date: format(date, 'd') }
  if (isYesterday(date)) return { day: 'Yesterday', date: format(date, 'd') }
  return { day: format(date, 'EEE'), date: format(date, 'd') }
}

function generateDaysWithEvents(
  incomeEntries: IncomeEntry[],
  bills: Bill[],
  pastDays: number,
  futureDays: number,
  transactions: Transaction[] = [],
): { days: DayEvents[]; todayIndex: number } {
  const today = startOfDay(new Date())
  const start = subDays(today, pastDays)
  const end = addDays(today, futureDays)
  const totalDays = pastDays + futureDays
  const result: DayEvents[] = []

  // Build a map of events by date
  const eventsByDate = new Map<string, { type: 'income' | 'bill' | 'expense'; name: string; amount: number }[]>()

  // Add income events
  for (const income of incomeEntries) {
    if (!income.is_recurring || !income.pay_frequency || !income.next_pay_date) continue

    // Walk backwards from next_pay_date to find occurrences in past range
    let payDate = parseISO(income.next_pay_date)

    // Rewind pay date to before our start
    while (isBefore(start, payDate)) {
      if (income.pay_frequency === 'weekly') {
        payDate = subDays(payDate, 7)
      } else if (income.pay_frequency === 'fortnightly') {
        payDate = subDays(payDate, 14)
      } else if (income.pay_frequency === 'quarterly') {
        payDate = new Date(payDate.getFullYear(), payDate.getMonth() - 3, payDate.getDate())
      } else if (income.pay_frequency === 'yearly') {
        payDate = new Date(payDate.getFullYear() - 1, payDate.getMonth(), payDate.getDate())
      } else {
        payDate = new Date(payDate.getFullYear(), payDate.getMonth() - 1, payDate.getDate())
      }
    }

    // Now walk forward through the range
    while (payDate <= end) {
      if (payDate >= start) {
        const dateKey = format(payDate, 'yyyy-MM-dd')
        const existing = eventsByDate.get(dateKey) || []
        existing.push({ type: 'income', name: income.source, amount: income.amount })
        eventsByDate.set(dateKey, existing)
      }

      if (income.pay_frequency === 'weekly') {
        payDate = addDays(payDate, 7)
      } else if (income.pay_frequency === 'fortnightly') {
        payDate = addDays(payDate, 14)
      } else if (income.pay_frequency === 'quarterly') {
        payDate = new Date(payDate.getFullYear(), payDate.getMonth() + 3, payDate.getDate())
      } else if (income.pay_frequency === 'yearly') {
        payDate = new Date(payDate.getFullYear() + 1, payDate.getMonth(), payDate.getDate())
      } else {
        payDate = new Date(payDate.getFullYear(), payDate.getMonth() + 1, payDate.getDate())
      }
    }
  }

  // Add bill events
  for (const bill of bills) {
    if (!bill.is_active) continue

    let billDate = parseISO(bill.next_due)

    // Rewind bill date to before our start (for recurring bills)
    if (!bill.is_one_off) {
      while (isBefore(start, billDate)) {
        switch (bill.frequency) {
          case 'weekly':
            billDate = subDays(billDate, 7)
            break
          case 'fortnightly':
            billDate = subDays(billDate, 14)
            break
          case 'monthly':
            billDate = new Date(billDate.getFullYear(), billDate.getMonth() - 1, billDate.getDate())
            break
          case 'quarterly':
            billDate = new Date(billDate.getFullYear(), billDate.getMonth() - 3, billDate.getDate())
            break
          case 'yearly':
            billDate = new Date(billDate.getFullYear() - 1, billDate.getMonth(), billDate.getDate())
            break
        }
      }
    }

    while (billDate <= end) {
      if (billDate >= start) {
        const dateKey = format(billDate, 'yyyy-MM-dd')
        const existing = eventsByDate.get(dateKey) || []
        existing.push({ type: 'bill', name: bill.name, amount: bill.amount })
        eventsByDate.set(dateKey, existing)
      }

      if (bill.is_one_off) break

      switch (bill.frequency) {
        case 'weekly':
          billDate = addDays(billDate, 7)
          break
        case 'fortnightly':
          billDate = addDays(billDate, 14)
          break
        case 'monthly':
          billDate = new Date(billDate.getFullYear(), billDate.getMonth() + 1, billDate.getDate())
          break
        case 'quarterly':
          billDate = new Date(billDate.getFullYear(), billDate.getMonth() + 3, billDate.getDate())
          break
        case 'yearly':
          billDate = new Date(billDate.getFullYear() + 1, billDate.getMonth(), billDate.getDate())
          break
      }
    }
  }

  // Add expense totals from actual transactions (past/today only)
  const todayStr = format(today, 'yyyy-MM-dd')
  const expenseByDate = new Map<string, number>()
  for (const txn of transactions) {
    if (txn.type === 'expense' && txn.date <= todayStr) {
      expenseByDate.set(txn.date, (expenseByDate.get(txn.date) || 0) + Number(txn.amount))
    }
  }
  for (const [dateKey, total] of expenseByDate) {
    const existing = eventsByDate.get(dateKey) || []
    existing.push({ type: 'expense', name: 'Daily spending', amount: total })
    eventsByDate.set(dateKey, existing)
  }

  // Generate day array
  for (let i = 0; i < totalDays; i++) {
    const date = addDays(start, i)
    const dateKey = format(date, 'yyyy-MM-dd')
    result.push({
      date: dateKey,
      events: eventsByDate.get(dateKey) || [],
    })
  }

  return { days: result, todayIndex: pastDays }
}

export function CashflowPreview({ incomeEntries, bills, transactions = [] }: CashflowPreviewProps) {
  const [selectedDay, setSelectedDay] = useState<DayEvents | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLButtonElement>(null)

  // Auto-scroll so today is the second visible card from the left
  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const container = scrollRef.current
      const todayEl = todayRef.current
      const containerRect = container.getBoundingClientRect()
      const todayRect = todayEl.getBoundingClientRect()
      // How far today currently is from the container's left edge, plus current scroll
      const todayScrollPos = todayRect.left - containerRect.left + container.scrollLeft
      // Offset by one card width + gap so today lands as the second card
      container.scrollLeft = Math.max(0, todayScrollPos - todayEl.offsetWidth - 8)
    }
  }, [])

  // Check if pay schedule is configured
  const hasPaySchedule = incomeEntries.some(
    (income) => income.pay_frequency && income.pay_day !== null
  )

  if (!hasPaySchedule && bills.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-gray-900">Upcoming</h2>
          <Link href="/budget" className="text-sm text-bloom-600 hover:text-bloom-700 font-medium">
            Set up
          </Link>
        </div>
        <div className="card bg-gradient-to-r from-gray-50 to-gray-100 text-center py-4">
          <p className="text-sm text-gray-500">Set up your pay schedule to see upcoming events</p>
        </div>
      </section>
    )
  }

  const { days: daysWithEvents } = generateDaysWithEvents(incomeEntries, bills, 7, 14, transactions)

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-gray-900">Upcoming</h2>
        <Link href="/cashflow" className="text-sm text-bloom-600 hover:text-bloom-700 font-medium flex items-center gap-1">
          View all
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Horizontal scrollable day-by-day timeline */}
      <div ref={scrollRef} className="overflow-x-auto -mx-4 px-4 pb-2">
        <div className="flex gap-2" style={{ width: 'max-content' }}>
          {daysWithEvents.map((day) => {
            const { day: dayLabel, date } = formatDayLabel(day.date)
            const dayDate = parseISO(day.date)
            const isPast = isBefore(dayDate, startOfDay(new Date())) && !isToday(dayDate)
            const totalIn = day.events.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0)
            const totalOut = day.events.filter(e => e.type === 'bill' || e.type === 'expense').reduce((sum, e) => sum + e.amount, 0)
            const net = totalIn - totalOut
            const hasEvents = day.events.length > 0

            return (
              <button
                key={day.date}
                ref={isToday(dayDate) ? todayRef : undefined}
                onClick={() => setSelectedDay(day)}
                className={`flex-shrink-0 w-16 rounded-xl p-2 text-center transition-all ${
                  isToday(dayDate)
                    ? 'bg-bloom-100 border-2 border-bloom-300'
                    : isPast
                    ? hasEvents
                      ? 'bg-gray-100 border border-gray-200 hover:border-gray-300 opacity-70'
                      : 'bg-gray-50 border border-gray-100 hover:border-gray-200 opacity-50'
                    : hasEvents
                    ? 'bg-white border border-gray-200 hover:border-gray-300'
                    : 'bg-gray-50 border border-gray-100 hover:border-gray-200'
                }`}
              >
                <p className={`text-[10px] font-medium ${
                  isToday(dayDate) ? 'text-bloom-700' : 'text-gray-500'
                }`}>
                  {dayLabel}
                </p>
                <p className={`text-sm font-bold mb-2 ${
                  isToday(dayDate) ? 'text-bloom-800' : 'text-gray-700'
                }`}>
                  {date}
                </p>

                {/* Single net value for the day */}
                {hasEvents ? (
                  <div className="flex items-center justify-center gap-0.5">
                    {net >= 0 ? (
                      <ArrowUpCircle className="w-3 h-3 text-sprout-500" />
                    ) : (
                      <ArrowDownCircle className="w-3 h-3 text-coral-500" />
                    )}
                    <span className={`text-[10px] font-semibold ${net >= 0 ? 'text-sprout-600' : 'text-coral-600'}`}>
                      {net >= 0 ? '+' : '-'}${Math.round(Math.abs(net))}
                    </span>
                  </div>
                ) : (
                  <div className="h-4 flex items-center justify-center">
                    <span className="text-[10px] text-gray-300">—</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day detail modal */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedDay(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-xl animate-slide-up mb-16">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100">
              <div>
                <p className="text-sm text-gray-500">
                  {isToday(parseISO(selectedDay.date))
                    ? 'Today'
                    : isTomorrow(parseISO(selectedDay.date))
                    ? 'Tomorrow'
                    : format(parseISO(selectedDay.date), 'EEEE')}
                </p>
                <h3 className="font-display text-xl font-semibold">
                  {format(parseISO(selectedDay.date), 'MMMM d, yyyy')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Events - scrollable */}
            <div className="px-6 py-4 pb-8 max-h-[50vh] overflow-y-auto">
              {selectedDay.events.length > 0 ? (
                <div className="space-y-3">
                  {selectedDay.events.map((event, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-4 rounded-xl ${
                        event.type === 'income' ? 'bg-sprout-50' : event.type === 'expense' ? 'bg-amber-50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {event.type === 'income' ? (
                          <div className="w-10 h-10 rounded-full bg-sprout-100 flex items-center justify-center">
                            <ArrowUpCircle className="w-5 h-5 text-sprout-600" />
                          </div>
                        ) : event.type === 'expense' ? (
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <ArrowDownCircle className="w-5 h-5 text-amber-600" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-coral-100 flex items-center justify-center">
                            <ArrowDownCircle className="w-5 h-5 text-coral-500" />
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-gray-900">{event.name}</span>
                          <p className="text-xs text-gray-500">
                            {event.type === 'income' ? 'Income' : event.type === 'expense' ? 'Spending' : 'Bill'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-lg font-semibold ${
                        event.type === 'income' ? 'text-sprout-600' : event.type === 'expense' ? 'text-amber-600' : 'text-gray-700'
                      }`}>
                        {event.type === 'income' ? '+' : '-'}{formatCurrency(event.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <span className="text-2xl">📅</span>
                  </div>
                  <p className="text-sm">No income or bills on this day</p>
                </div>
              )}
            </div>
          </div>

          <style jsx>{`
            @keyframes slide-up {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            .animate-slide-up {
              animation: slide-up 0.3s ease-out;
            }
          `}</style>
        </div>
      )}
    </section>
  )
}
