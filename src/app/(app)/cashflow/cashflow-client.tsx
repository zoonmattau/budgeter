'use client'

import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CashflowTimelineChart } from '@/components/cashflow/cashflow-timeline-chart'
import { CashflowEventsList } from '@/components/cashflow/cashflow-events-list'
import {
  calculateTimeline,
  findLowestBalance,
  hasNegativeBalance,
  getFirstNegativeDate,
  type IncomeEntry,
  type Bill,
  type Account,
} from '@/lib/timeline-calculator'

interface CashflowClientProps {
  accounts: Account[]
  incomeEntries: IncomeEntry[]
  bills: Bill[]
}

const TIME_RANGES = [
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
]

export function CashflowClient({
  accounts,
  incomeEntries,
  bills,
}: CashflowClientProps) {
  const [days, setDays] = useState(30)

  const timeline = useMemo(
    () =>
      calculateTimeline({
        days,
        accounts,
        incomeEntries,
        bills,
      }),
    [days, accounts, incomeEntries, bills]
  )

  const currentBalance = timeline[0]?.projectedBalance ?? 0
  const lowestPoint = findLowestBalance(timeline)
  const willGoNegative = hasNegativeBalance(timeline)
  const firstNegativeDate = getFirstNegativeDate(timeline)

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex justify-end">
        <div className="inline-flex gap-1 p-1 bg-gray-100 rounded-full">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setDays(range.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                days === range.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card bg-gradient-to-br from-bloom-50 to-sprout-50">
          <p className="text-xs text-gray-600">Current Balance</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(currentBalance)}
          </p>
        </div>
        <div
          className={`card ${
            lowestPoint && lowestPoint.balance < 0
              ? 'bg-gradient-to-br from-red-50 to-coral-50'
              : 'bg-gradient-to-br from-sprout-50 to-bloom-50'
          }`}
        >
          <p className="text-xs text-gray-600">Lowest Point</p>
          <div className="flex items-baseline gap-1">
            <p
              className={`text-xl font-bold ${
                lowestPoint && lowestPoint.balance < 0
                  ? 'text-red-600'
                  : 'text-gray-900'
              }`}
            >
              {lowestPoint ? formatCurrency(lowestPoint.balance) : '$0'}
            </p>
            {lowestPoint && (
              <p className="text-xs text-gray-500">
                ({format(parseISO(lowestPoint.date), 'MMM d')})
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Negative balance warning */}
      {willGoNegative && firstNegativeDate && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 text-sm">
              Balance may go negative
            </p>
            <p className="text-red-600 text-xs mt-0.5">
              Projected to hit negative on{' '}
              {format(parseISO(firstNegativeDate), 'MMMM d')}. Consider adjusting
              your spending or timing of bills.
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-gray-900">
            Balance Projection
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-sprout-600">
              <TrendingUp className="w-3 h-3" />
              Income
            </span>
            <span className="flex items-center gap-1 text-coral-600">
              <TrendingDown className="w-3 h-3" />
              Bills
            </span>
          </div>
        </div>
        <CashflowTimelineChart timeline={timeline} height={250} />
      </div>

      {/* Upcoming events */}
      <div className="card">
        <h2 className="font-display text-lg font-semibold text-gray-900 mb-4">
          Upcoming Events
        </h2>
        <CashflowEventsList timeline={timeline} maxEvents={10} />
      </div>
    </div>
  )
}
