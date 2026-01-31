'use client'

import { formatCurrency } from '@/lib/utils'

interface MoneyBucketsOverviewProps {
  budgetAllocated: number
  budgetRemaining: number
  savingsTotal: number
  accountsTotal: number
}

export function MoneyBucketsOverview({
  budgetAllocated,
  budgetRemaining,
  savingsTotal,
  accountsTotal,
}: MoneyBucketsOverviewProps) {
  const total = budgetRemaining + savingsTotal + accountsTotal

  // Calculate percentages for the bar
  const budgetPercent = total > 0 ? (budgetRemaining / total) * 100 : 0
  const savingsPercent = total > 0 ? (savingsTotal / total) * 100 : 0
  const accountsPercent = total > 0 ? (accountsTotal / total) * 100 : 0

  return (
    <div className="card">
      {/* Segmented bar */}
      <div className="h-4 rounded-full overflow-hidden flex bg-gray-100 mb-4">
        {budgetPercent > 0 && (
          <div
            className="bg-bloom-500 transition-all"
            style={{ width: `${budgetPercent}%` }}
          />
        )}
        {savingsPercent > 0 && (
          <div
            className="bg-sprout-500 transition-all"
            style={{ width: `${savingsPercent}%` }}
          />
        )}
        {accountsPercent > 0 && (
          <div
            className="bg-blue-500 transition-all"
            style={{ width: `${accountsPercent}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-bloom-500" />
            <span className="text-xs text-gray-500">Budget</span>
          </div>
          <p className="font-semibold text-gray-900">{formatCurrency(budgetRemaining)}</p>
          <p className="text-xs text-gray-400">remaining</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-sprout-500" />
            <span className="text-xs text-gray-500">Savings</span>
          </div>
          <p className="font-semibold text-gray-900">{formatCurrency(savingsTotal)}</p>
          <p className="text-xs text-gray-400">saved</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-500">Accounts</span>
          </div>
          <p className="font-semibold text-gray-900">{formatCurrency(accountsTotal)}</p>
          <p className="text-xs text-gray-400">total</p>
        </div>
      </div>
    </div>
  )
}
