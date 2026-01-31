'use client'

import Link from 'next/link'
import { ArrowRight, Wallet } from 'lucide-react'
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
  const needsSetup = totalAllocated === 0 && totalIncome > 0
  const noIncome = totalIncome === 0

  // Show setup prompt when no budget is allocated
  if (needsSetup) {
    return (
      <Link
        href="/budget"
        className="block card bg-gradient-to-br from-coral-500 to-coral-600 text-white hover:from-coral-600 hover:to-coral-700 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg">Allocate Your Income</p>
            <p className="text-coral-100 text-sm mt-0.5">
              You have {formatCurrency(totalIncome)} to assign to spending categories
            </p>
          </div>
          <ArrowRight className="w-5 h-5 flex-shrink-0" />
        </div>

        <div className="mt-4 p-3 bg-white/10 rounded-xl">
          <p className="text-sm text-center">
            Give every dollar a job - tap here to build your budget
          </p>
        </div>
      </Link>
    )
  }

  // Show add income prompt when no income
  if (noIncome) {
    return (
      <Link
        href="/budget"
        className="block card bg-gradient-to-br from-gray-400 to-gray-500 text-white hover:from-gray-500 hover:to-gray-600 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg">Set Up Your Budget</p>
            <p className="text-gray-200 text-sm mt-0.5">
              Add your monthly income to get started
            </p>
          </div>
          <ArrowRight className="w-5 h-5 flex-shrink-0" />
        </div>
      </Link>
    )
  }

  // Normal budget view when set up
  const isUnderAllocated = unallocated > 0

  return (
    <Link href="/budget" className="block card bg-gradient-to-br from-bloom-500 to-bloom-600 text-white hover:from-bloom-600 hover:to-bloom-700 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]">
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
    </Link>
  )
}
