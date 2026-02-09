'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Wallet, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { MemberBreakdown, MemberSpending } from '@/components/ui/member-breakdown'
import type { ViewScope } from '@/lib/scope-context'

interface FixedCostItem {
  name: string
  amount: number
}

interface BudgetOverviewProps {
  totalIncome: number
  totalAllocated: number
  totalSpent: number
  discretionaryAllocated?: number
  discretionarySpent?: number
  fixedCostItems?: FixedCostItem[]
  scope?: ViewScope
  memberBreakdown?: MemberSpending[]
}

export function BudgetOverview({
  totalIncome,
  totalAllocated,
  totalSpent,
  discretionaryAllocated,
  discretionarySpent,
  fixedCostItems = [],
  scope = 'personal',
  memberBreakdown = [],
}: BudgetOverviewProps) {
  const [showFixedCosts, setShowFixedCosts] = useState(false)

  const unallocated = totalIncome - totalAllocated
  // Use discretionary amounts for "left to spend" if available
  const spendableAllocated = discretionaryAllocated ?? totalAllocated
  const spendableSpent = discretionarySpent ?? totalSpent
  const remaining = spendableAllocated - spendableSpent
  const spentPercentage = spendableAllocated > 0 ? (spendableSpent / spendableAllocated) * 100 : 0

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
  const fixedCosts = totalAllocated - spendableAllocated

  // Daily budget calculations
  const now = new Date()
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const daysLeft = totalDaysInMonth - dayOfMonth + 1 // including today
  const dailyBudget = spendableAllocated / totalDaysInMonth
  const leftPerDay = daysLeft > 0 ? remaining / daysLeft : 0
  const dailyAvgSpent = dayOfMonth > 0 ? spendableSpent / dayOfMonth : 0
  const dailySpendDiff = dailyBudget - dailyAvgSpent

  return (
    <div className="relative">
      <Link href="/budget" className="block card bg-gradient-to-br from-bloom-500 to-bloom-600 text-white hover:from-bloom-600 hover:to-bloom-700 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-bloom-100 text-sm font-medium">
              {isHousehold ? 'Household Spending Budget' : 'Spending Budget'}
            </p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(spendableAllocated)}</p>
          </div>
          <div className="text-right space-y-1">
            {fixedCosts > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowFixedCosts(!showFixedCosts)
                }}
                className="bg-white/15 hover:bg-white/25 rounded-lg px-2 py-1 transition-colors"
              >
                <p className="text-[11px] font-medium">{formatCurrency(fixedCosts)} fixed costs</p>
              </button>
            )}
            {isUnderAllocated && (
              <div className="bg-white/15 rounded-lg px-2 py-1">
                <p className="text-[11px] font-medium">{formatCurrency(unallocated)} unallocated</p>
              </div>
            )}
          </div>
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
            <p className="font-semibold">{formatCurrency(spendableSpent)}</p>
          </div>
          <div className="text-right">
            <p className="text-bloom-100">Left to spend</p>
            <p className={`font-semibold ${isOverBudget ? 'text-coral-300' : ''}`}>
              {formatCurrency(Math.abs(remaining))}
              {isOverBudget && ' over'}
            </p>
          </div>
        </div>

        {/* Daily budget info */}
        {spendableAllocated > 0 && (
          <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-sm">
            <div>
              <p className="text-bloom-100 text-xs">You can spend ({daysLeft}d left)</p>
              <p className={`font-semibold ${isOverBudget ? 'text-coral-300' : ''}`}>
                {formatCurrency(Math.max(0, leftPerDay))}/day
              </p>
            </div>
            <div className="text-right">
              <p className="text-bloom-100 text-xs">Avg spent/day</p>
              <p className="font-semibold">{formatCurrency(dailyAvgSpent)}/day</p>
              <p className={`text-xs mt-0.5 ${dailySpendDiff >= 0 ? 'text-white/70' : 'text-coral-300'}`}>
                {dailySpendDiff >= 0
                  ? `${formatCurrency(dailySpendDiff)}/day under`
                  : `${formatCurrency(Math.abs(dailySpendDiff))}/day over`
                }
              </p>
            </div>
          </div>
        )}

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
          {/* Fixed costs inline breakdown */}
        {showFixedCosts && fixedCostItems.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/20 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-bloom-100 text-xs font-medium">Fixed cost breakdown</p>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowFixedCosts(false)
                }}
                className="p-0.5 rounded hover:bg-white/15 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-bloom-200" />
              </button>
            </div>
            <div className="space-y-1.5">
              {fixedCostItems
                .sort((a, b) => b.amount - a.amount)
                .map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-white/80">{item.name}</span>
                    <span className="text-sm font-medium text-white">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20">
              <span className="text-xs font-medium text-bloom-100">Total fixed</span>
              <span className="text-sm font-bold text-white">{formatCurrency(fixedCosts)}</span>
            </div>
          </div>
        )}
      </Link>
    </div>
  )
}
