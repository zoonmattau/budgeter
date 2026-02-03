'use client'

import Link from 'next/link'
import { ArrowRight, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { MemberBreakdown, MemberSpending } from '@/components/ui/member-breakdown'
import { InfoTooltip } from '@/components/ui/tooltip'
import type { ViewScope } from '@/lib/scope-context'

interface BudgetOverviewProps {
  totalIncome: number
  totalAllocated: number
  totalSpent: number
  scope?: ViewScope
  memberBreakdown?: MemberSpending[]
}

export function BudgetOverview({
  totalIncome,
  totalAllocated,
  totalSpent,
  scope = 'personal',
  memberBreakdown = [],
}: BudgetOverviewProps) {
  const unallocated = totalIncome - totalAllocated
  const remaining = totalAllocated - totalSpent
  const spentPercentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0

  const isOverBudget = remaining < 0
  const needsSetup = totalAllocated === 0 && totalIncome > 0
  const noIncome = totalIncome === 0

  const isHousehold = scope === 'household'

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
            <p className="font-semibold text-lg">
              {isHousehold ? 'Allocate Household Income' : 'Allocate Your Income'}
            </p>
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
            <p className="font-semibold text-lg">
              {isHousehold ? 'Set Up Household Budget' : 'Set Up Your Budget'}
            </p>
            <p className="text-gray-200 text-sm mt-0.5">
              {isHousehold ? 'Add household income to get started' : 'Add your monthly income to get started'}
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
          <p className="text-bloom-100 text-sm font-medium">
            {isHousehold ? 'Household Budget' : 'Monthly Budget'}
          </p>
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
          <div className="flex items-center gap-1.5">
            <p className="text-bloom-100">Spent</p>
            <InfoTooltip text="Total expenses this month across all categories" />
          </div>
          <p className="font-semibold">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <p className="text-bloom-100">Remaining</p>
            <InfoTooltip text="Amount left to spend before hitting your budget limit" />
          </div>
          <p className={`font-semibold ${isOverBudget ? 'text-coral-300' : ''}`}>
            {formatCurrency(Math.abs(remaining))}
            {isOverBudget && ' over'}
          </p>
        </div>
      </div>

      {/* Member breakdown for household view */}
      {isHousehold && memberBreakdown.length > 0 && totalSpent > 0 && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-bloom-100 text-xs mb-2">Spending by member</p>
          <MemberBreakdown
            breakdown={memberBreakdown}
            total={totalSpent}
            showLegend={true}
            showAmounts={true}
            className="text-white [&_span]:text-white/90 [&_.text-gray-700]:text-white [&_.text-gray-500]:text-white/70"
          />
        </div>
      )}
    </Link>
  )
}
