'use client'

import { formatCurrency } from '@/lib/utils'

interface BudgetOverviewProps {
  totalIncome: number
  totalAllocated: number
  totalSpent: number
}

export function BudgetOverview({ totalIncome, totalAllocated, totalSpent }: BudgetOverviewProps) {
  const unallocated = totalIncome - totalAllocated
  const remaining = totalAllocated - totalSpent
  const spentPercentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0

  const isOverBudget = remaining < 0
  const isUnderAllocated = unallocated > 0

  return (
    <div className="card bg-gradient-to-br from-bloom-500 to-bloom-600 text-white">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-bloom-100 text-sm font-medium">Monthly Budget</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(totalAllocated)}</p>
        </div>
        {isUnderAllocated && (
          <div className="bg-white/20 rounded-lg px-2 py-1">
            <p className="text-xs font-medium">{formatCurrency(unallocated)} unallocated</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-white/20 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOverBudget ? 'bg-coral-400' : 'bg-white'
          }`}
          style={{ width: `${Math.min(spentPercentage, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <div>
          <p className="text-bloom-100">Spent</p>
          <p className="font-semibold">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="text-right">
          <p className="text-bloom-100">Remaining</p>
          <p className={`font-semibold ${isOverBudget ? 'text-coral-300' : ''}`}>
            {formatCurrency(Math.abs(remaining))}
            {isOverBudget && ' over'}
          </p>
        </div>
      </div>
    </div>
  )
}
