'use client'

import { useState } from 'react'
import { SpendingDonut } from './spending-donut'
import { SpendingTrend } from './spending-trend'
import { CategoryBarChart } from './category-bar-chart'
import { TogglePills } from '@/components/ui/toggle-pills'
import {
  aggregateSpendingByCategory,
  getDailySpending,
  getCategoryBudgetComparison,
  getAverageDailySpending,
} from '@/lib/chart-utils'
import { formatCurrency } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'

type Transaction = Tables<'transactions'> & {
  categories: Tables<'categories'> | null
}

type Budget = Tables<'budgets'> & {
  categories: Tables<'categories'> | null
}

type TimePeriod = '7' | '30' | '90'

interface InsightsClientProps {
  transactions: Transaction[]
  budgets: Budget[]
  totalIncome: number
  totalBudgeted: number
}

export function InsightsClient({
  transactions,
  budgets,
  totalIncome,
  totalBudgeted,
}: InsightsClientProps) {
  const [period, setPeriod] = useState<TimePeriod>('30')

  const days = parseInt(period)

  // Filter transactions for selected period
  const periodStart = new Date()
  periodStart.setDate(periodStart.getDate() - days)
  const periodStartStr = periodStart.toISOString().split('T')[0]

  const filteredTransactions = transactions.filter(
    (t) => t.date >= periodStartStr
  )

  // Calculate chart data
  const categoryData = aggregateSpendingByCategory(filteredTransactions, 6)
  const dailyData = getDailySpending(filteredTransactions, days)
  const budgetComparison = getCategoryBudgetComparison(filteredTransactions, budgets)

  // Stats
  const totalSpent = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const averageDaily = getAverageDailySpending(filteredTransactions, days)
  const dailyBudget = totalBudgeted / 30

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <TogglePills
        options={[
          { value: '7', label: '7 days' },
          { value: '30', label: '30 days' },
          { value: '90', label: '90 days' },
        ]}
        value={period}
        onChange={setPeriod}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-sm text-gray-500">Total Spent</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
          <p className="text-xs text-gray-400">last {days} days</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Daily Average</p>
          <p className="text-xl font-bold text-bloom-600">{formatCurrency(averageDaily)}</p>
          <p className="text-xs text-gray-400">
            {averageDaily <= dailyBudget ? 'On track' : 'Over budget'}
          </p>
        </div>
      </div>

      {/* Spending by category */}
      <section className="card">
        <h2 className="font-display font-semibold text-gray-900 mb-4">
          Spending by Category
        </h2>
        <SpendingDonut data={categoryData} height={220} />
      </section>

      {/* Daily spending trend */}
      <section className="card">
        <h2 className="font-display font-semibold text-gray-900 mb-1">
          Daily Spending
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Green line shows your daily budget target
        </p>
        <SpendingTrend data={dailyData} height={220} dailyBudget={dailyBudget} />
      </section>

      {/* Budget vs actual */}
      {budgetComparison.length > 0 && (
        <section className="card">
          <h2 className="font-display font-semibold text-gray-900 mb-1">
            Budget vs Actual
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Green dashed line shows your budget for each category
          </p>
          <CategoryBarChart data={budgetComparison} height={Math.max(200, budgetComparison.length * 50)} />
        </section>
      )}

      {/* Income breakdown */}
      {totalIncome > 0 && (
        <section className="card">
          <h2 className="font-display font-semibold text-gray-900 mb-4">
            Monthly Overview
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Monthly Income</span>
              <span className="font-semibold text-sprout-600">{formatCurrency(totalIncome)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Budgeted</span>
              <span className="font-semibold text-bloom-600">{formatCurrency(totalBudgeted)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Unallocated</span>
              <span className={`font-semibold ${totalIncome - totalBudgeted >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                {formatCurrency(totalIncome - totalBudgeted)}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-bloom-500"
                style={{ width: `${Math.min((totalBudgeted / totalIncome) * 100, 100)}%` }}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
