'use client'

import { useState } from 'react'
import { TrendingUp, DollarSign, PiggyBank, Briefcase } from 'lucide-react'
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

interface IncomeMonth {
  month: string
  label: string
  shortLabel: string
  amount: number
}

interface NetWorthSnapshot {
  date: string
  label: string
  shortLabel: string
  netWorth: number
  totalAssets: number
}

interface InsightsClientProps {
  transactions: Transaction[]
  budgets: Budget[]
  totalIncome: number
  totalBudgeted: number
  incomeByMonth?: IncomeMonth[]
  totalLifetimeIncome?: number
  netWorthHistory?: NetWorthSnapshot[]
  currentInvestments?: number
  investmentAccounts?: Tables<'accounts'>[]
}

export function InsightsClient({
  transactions,
  budgets,
  totalIncome,
  totalBudgeted,
  incomeByMonth = [],
  totalLifetimeIncome = 0,
  netWorthHistory = [],
  currentInvestments = 0,
  investmentAccounts = [],
}: InsightsClientProps) {
  const [period, setPeriod] = useState<TimePeriod>('30')
  const [activeTab, setActiveTab] = useState<'spending' | 'income' | 'investments'>('spending')

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

  // Calculate income growth
  const firstIncomeMonth = incomeByMonth.find(m => m.amount > 0)
  const lastIncomeMonth = incomeByMonth[incomeByMonth.length - 1]
  const incomeGrowth = firstIncomeMonth && lastIncomeMonth
    ? lastIncomeMonth.amount - firstIncomeMonth.amount
    : 0

  // Calculate net worth growth
  const firstNetWorth = netWorthHistory[0]
  const lastNetWorth = netWorthHistory[netWorthHistory.length - 1]
  const netWorthGrowth = firstNetWorth && lastNetWorth
    ? lastNetWorth.netWorth - firstNetWorth.netWorth
    : 0
  const netWorthGrowthPercent = firstNetWorth && firstNetWorth.netWorth !== 0
    ? ((lastNetWorth?.netWorth || 0) - firstNetWorth.netWorth) / Math.abs(firstNetWorth.netWorth) * 100
    : 0

  // Max values for chart scaling
  const maxIncome = Math.max(...incomeByMonth.map(m => m.amount), 1)
  const maxNetWorth = Math.max(...netWorthHistory.map(n => n.netWorth), 1)

  return (
    <div className="space-y-6">
      {/* Tab selector */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        <button
          onClick={() => setActiveTab('spending')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'spending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          Spending
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'income' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          Income
        </button>
        <button
          onClick={() => setActiveTab('investments')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'investments' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          Investments
        </button>
      </div>

      {/* SPENDING TAB */}
      {activeTab === 'spending' && (
        <>
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
        </>
      )}

      {/* INCOME TAB */}
      {activeTab === 'income' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card bg-gradient-to-br from-sprout-50 to-green-50">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-sprout-500" />
                <p className="text-xs text-gray-500">Total Earned (12mo)</p>
              </div>
              <p className="text-xl font-bold text-sprout-600">{formatCurrency(totalLifetimeIncome)}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-bloom-500" />
                <p className="text-xs text-gray-500">Growth</p>
              </div>
              <p className={`text-xl font-bold ${incomeGrowth >= 0 ? 'text-sprout-600' : 'text-red-500'}`}>
                {incomeGrowth >= 0 ? '+' : ''}{formatCurrency(incomeGrowth)}
              </p>
            </div>
          </div>

          {/* Income history chart */}
          <section className="card">
            <h2 className="font-display font-semibold text-gray-900 mb-4">
              Income History
            </h2>
            {incomeByMonth.length > 0 ? (
              <div className="relative h-48">
                <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 0.5, 1].map((ratio) => (
                    <line
                      key={ratio}
                      x1="0"
                      y1={50 * (1 - ratio)}
                      x2="100"
                      y2={50 * (1 - ratio)}
                      stroke="#e5e7eb"
                      strokeWidth="0.5"
                    />
                  ))}
                  {/* Bars */}
                  {incomeByMonth.map((month, i) => {
                    const barWidth = 100 / incomeByMonth.length - 2
                    const barHeight = (month.amount / maxIncome) * 45
                    const x = (i / incomeByMonth.length) * 100 + 1
                    return (
                      <rect
                        key={month.month}
                        x={x}
                        y={50 - barHeight}
                        width={barWidth}
                        height={barHeight}
                        fill="#4ade80"
                        rx="1"
                      />
                    )
                  })}
                </svg>
                {/* X-axis labels */}
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  {incomeByMonth.filter((_, i) => i % 3 === 0).map(month => (
                    <span key={month.month}>{month.shortLabel}</span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No income data available</p>
            )}
          </section>

          {/* Monthly breakdown */}
          <section className="card">
            <h2 className="font-display font-semibold text-gray-900 mb-4">
              Monthly Breakdown
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {incomeByMonth.slice().reverse().map(month => (
                <div key={month.month} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-600">{month.label}</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(month.amount)}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* INVESTMENTS TAB */}
      {activeTab === 'investments' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card bg-gradient-to-br from-bloom-50 to-purple-50">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-4 h-4 text-bloom-500" />
                <p className="text-xs text-gray-500">Total Investments</p>
              </div>
              <p className="text-xl font-bold text-bloom-600">{formatCurrency(currentInvestments)}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-sprout-500" />
                <p className="text-xs text-gray-500">Net Worth Growth</p>
              </div>
              <p className={`text-xl font-bold ${netWorthGrowth >= 0 ? 'text-sprout-600' : 'text-red-500'}`}>
                {netWorthGrowth >= 0 ? '+' : ''}{formatCurrency(netWorthGrowth)}
              </p>
              {netWorthGrowthPercent !== 0 && (
                <p className={`text-xs ${netWorthGrowthPercent >= 0 ? 'text-sprout-500' : 'text-red-400'}`}>
                  {netWorthGrowthPercent >= 0 ? '+' : ''}{netWorthGrowthPercent.toFixed(1)}%
                </p>
              )}
            </div>
          </div>

          {/* Net worth history chart */}
          {netWorthHistory.length > 1 && (
            <section className="card">
              <h2 className="font-display font-semibold text-gray-900 mb-4">
                Net Worth Over Time
              </h2>
              <div className="relative h-48 pl-12">
                <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 0.5, 1].map((ratio) => (
                    <line
                      key={ratio}
                      x1="0"
                      y1={50 * (1 - ratio)}
                      x2="100"
                      y2={50 * (1 - ratio)}
                      stroke="#e5e7eb"
                      strokeWidth="0.5"
                    />
                  ))}
                  {/* Area fill */}
                  <path
                    d={`${netWorthHistory.map((s, i) => {
                      const x = (i / (netWorthHistory.length - 1)) * 100
                      const y = 50 - (s.netWorth / maxNetWorth) * 45
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                    }).join(' ')} L 100 50 L 0 50 Z`}
                    fill="url(#netWorthGradient)"
                  />
                  <defs>
                    <linearGradient id="netWorthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  {/* Line */}
                  <path
                    d={netWorthHistory.map((s, i) => {
                      const x = (i / (netWorthHistory.length - 1)) * 100
                      const y = 50 - (s.netWorth / maxNetWorth) * 45
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                    }).join(' ')}
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="1.5"
                  />
                </svg>
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-400 pr-2 text-right">
                  <span>${Math.round(maxNetWorth / 1000)}k</span>
                  <span>$0</span>
                </div>
              </div>
            </section>
          )}

          {/* Investment accounts */}
          {investmentAccounts.length > 0 && (
            <section className="card">
              <h2 className="font-display font-semibold text-gray-900 mb-4">
                Investment Accounts
              </h2>
              <div className="space-y-3">
                {investmentAccounts.map(account => (
                  <div key={account.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{account.name}</p>
                      <p className="text-xs text-gray-500">{account.institution || 'Investment'}</p>
                    </div>
                    <span className="font-semibold text-bloom-600">{formatCurrency(account.balance)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {investmentAccounts.length === 0 && netWorthHistory.length === 0 && (
            <div className="card text-center py-12">
              <PiggyBank className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No Investment Data</h3>
              <p className="text-gray-500 text-sm">
                Add investment accounts in Net Worth to track your portfolio growth.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
