'use client'

import { useState } from 'react'
import { TrendingUp, DollarSign, PiggyBank, Briefcase, Repeat, CreditCard, ChevronDown, ChevronUp } from 'lucide-react'
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

type Bill = Tables<'bills'> & {
  categories: Tables<'categories'> | null
}

type TimePeriod = '7' | '30' | '90' | '180' | '365'

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
  bills?: Bill[]
}

export function InsightsClient({
  transactions,
  budgets,
  totalIncome: _totalIncome,
  totalBudgeted,
  incomeByMonth = [],
  totalLifetimeIncome = 0,
  netWorthHistory = [],
  currentInvestments = 0,
  investmentAccounts = [],
  bills = [],
}: InsightsClientProps) {
  const [period, setPeriod] = useState<TimePeriod>('30')
  const [activeTab, setActiveTab] = useState<'spending' | 'income' | 'investments' | 'bills'>('spending')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null)

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
  const budgetComparisonRaw = getCategoryBudgetComparison(filteredTransactions, budgets)
  // Scale budgets to match selected period (budgets are monthly)
  const budgetScale = days / 30
  const budgetComparison = budgetComparisonRaw.map(b => ({
    ...b,
    budgeted: Math.round(b.budgeted * budgetScale * 100) / 100,
  }))

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
        <button
          onClick={() => setActiveTab('bills')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'bills' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          Bills
        </button>
      </div>

      {/* SPENDING TAB */}
      {activeTab === 'spending' && (
        <>
          {/* Period selector */}
          <TogglePills
            options={[
              { value: '7', label: '7d' },
              { value: '30', label: '30d' },
              { value: '90', label: '90d' },
              { value: '180', label: '6mo' },
              { value: '365', label: '1yr' },
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
          <p className="text-sm text-gray-500">Daily Spending Average</p>
          <p className="text-xl font-bold text-bloom-600">{formatCurrency(averageDaily)}</p>
          <p className="text-xs text-gray-400">
            {averageDaily <= dailyBudget ? (
              <span className="text-sprout-500">Under your {formatCurrency(dailyBudget)}/day target</span>
            ) : (
              <span className="text-coral-500">{formatCurrency(averageDaily - dailyBudget)}/day over target</span>
            )}
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
          <h2 className="font-display font-semibold text-gray-900 mb-4">
            Budget vs Actual
          </h2>
          <CategoryBarChart
            data={budgetComparison}
            onCategoryClick={(name) => setSelectedCategory(selectedCategory === name ? null : name)}
            selectedCategory={selectedCategory}
          />

          {/* Category transaction drill-down */}
          {selectedCategory && (() => {
            const cat = budgetComparison.find(c => c.name === selectedCategory)
            if (!cat) return null
            const catTransactions = filteredTransactions
              .filter(t => t.type === 'expense' && t.category_id === cat.categoryId)
              .sort((a, b) => b.date.localeCompare(a.date))

            return (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">{selectedCategory} Transactions</h3>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Close
                  </button>
                </div>
                {catTransactions.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No transactions in this category</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {catTransactions.map(t => (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{t.description}</p>
                          <p className="text-xs text-gray-400">{new Date(t.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</p>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 ml-3">{formatCurrency(Number(t.amount))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
        </section>
      )}

      {/* Budget Breakdown by Category */}
      {budgetComparisonRaw.length > 0 && (
        <section className="card">
          <h2 className="font-display font-semibold text-gray-900 mb-4">
            Budget Breakdown
          </h2>
          {/* Segmented bar */}
          <div className="h-8 rounded-lg overflow-hidden flex mb-4">
            {budgetComparisonRaw.map((cat, i) => {
              const percent = totalBudgeted > 0 ? (cat.budgeted / totalBudgeted) * 100 : 0
              if (percent < 1) return null
              return (
                <div
                  key={i}
                  className="h-full relative group cursor-pointer"
                  style={{ width: `${percent}%`, backgroundColor: cat.color }}
                  title={`${cat.name}: ${formatCurrency(cat.budgeted)}`}
                >
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
                </div>
              )
            })}
          </div>
          {/* Category breakdown list */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {budgetComparisonRaw
              .filter(b => b.budgeted > 0 || b.spent > 0)
              .sort((a, b) => b.budgeted - a.budgeted)
              .map((cat, i) => {
                const budgetPercent = totalBudgeted > 0 ? (cat.budgeted / totalBudgeted) * 100 : 0
                const spentPercent = cat.budgeted > 0 ? (cat.spent / cat.budgeted) * 100 : 0
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-900 truncate">{cat.name}</span>
                        <span className="text-gray-500 ml-2">{budgetPercent.toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{formatCurrency(cat.spent)} / {formatCurrency(cat.budgeted)}</span>
                        <span className={spentPercent > 100 ? 'text-red-500' : spentPercent > 80 ? 'text-amber-500' : 'text-sprout-500'}>
                          {spentPercent.toFixed(0)}% used
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
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
              <div>
                {/* Y-axis label */}
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>{formatCurrency(maxIncome)}</span>
                </div>
                {/* Bar chart */}
                <div className="flex items-end gap-1 h-40 border-b border-gray-200">
                  {incomeByMonth.map((month) => {
                    const heightPercent = maxIncome > 0 ? (month.amount / maxIncome) * 100 : 0
                    return (
                      <div key={month.month} className="flex-1 flex flex-col items-center justify-end h-full">
                        <div
                          className="w-full rounded-t bg-sprout-400 min-h-[2px] transition-all"
                          style={{ height: `${Math.max(heightPercent, month.amount > 0 ? 2 : 0)}%` }}
                          title={`${month.label}: ${formatCurrency(month.amount)}`}
                        />
                      </div>
                    )
                  })}
                </div>
                {/* X-axis labels */}
                <div className="flex gap-1 mt-1.5">
                  {incomeByMonth.map((month, i) => (
                    <div key={month.month} className="flex-1 text-center">
                      <span className="text-[10px] text-gray-400">
                        {incomeByMonth.length <= 6 || i % 2 === 0 ? month.shortLabel : ''}
                      </span>
                    </div>
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

      {/* BILLS & RECURRING TAB */}
      {activeTab === 'bills' && (() => {
        // Filter expenses for selected period
        const expenses = filteredTransactions.filter(t => t.type === 'expense')
        const recurringExpenses = expenses.filter(t => t.is_recurring)
        const oneOffExpenses = expenses.filter(t => !t.is_recurring)

        const totalRecurring = recurringExpenses.reduce((sum, t) => sum + Number(t.amount), 0)
        const totalOneOff = oneOffExpenses.reduce((sum, t) => sum + Number(t.amount), 0)
        const activeBills = bills.filter(b => b.is_active)

        // Monthly estimated cost from active bills
        const monthlyBillCost = activeBills.reduce((sum, b) => {
          const amount = Number(b.amount)
          switch (b.frequency) {
            case 'weekly': return sum + amount * 52 / 12
            case 'fortnightly': return sum + amount * 26 / 12
            case 'monthly': return sum + amount
            case 'quarterly': return sum + amount / 3
            case 'yearly': return sum + amount / 12
            default: return sum + amount
          }
        }, 0)

        // Bill-linked transactions grouped by month
        const billTransactions = expenses.filter(t => t.bill_id)
        const billsByMonth: Record<string, number> = {}
        billTransactions.forEach(t => {
          const monthKey = t.date.substring(0, 7) // YYYY-MM
          billsByMonth[monthKey] = (billsByMonth[monthKey] || 0) + Number(t.amount)
        })
        const billMonthEntries = Object.entries(billsByMonth)
          .sort(([a], [b]) => a.localeCompare(b))
        const maxBillMonth = Math.max(...billMonthEntries.map(([, v]) => v), 1)

        // Per-bill tracking: group bill-linked transactions by bill
        const billSpending = activeBills.map(bill => {
          const txns = expenses.filter(t => t.bill_id === bill.id)
          const totalPaid = txns.reduce((sum, t) => sum + Number(t.amount), 0)
          return {
            bill,
            transactions: txns.sort((a, b) => b.date.localeCompare(a.date)),
            totalPaid,
            categoryName: bill.categories?.name || 'Uncategorized',
          }
        }).sort((a, b) => b.totalPaid - a.totalPaid)

        // Recurring vs one-off bar widths
        const maxSplit = Math.max(totalRecurring, totalOneOff, 1)

        return (
          <>
            {/* Period selector */}
            <TogglePills
              options={[
                { value: '7', label: '7d' },
                { value: '30', label: '30d' },
                { value: '90', label: '90d' },
                { value: '180', label: '6mo' },
                { value: '365', label: '1yr' },
              ]}
              value={period}
              onChange={setPeriod}
            />

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="card">
                <div className="flex items-center gap-1.5 mb-1">
                  <Repeat className="w-3.5 h-3.5 text-bloom-500" />
                  <p className="text-[11px] text-gray-500">Recurring/mo</p>
                </div>
                <p className="text-lg font-bold text-bloom-600">{formatCurrency(monthlyBillCost)}</p>
              </div>
              <div className="card">
                <div className="flex items-center gap-1.5 mb-1">
                  <CreditCard className="w-3.5 h-3.5 text-gray-500" />
                  <p className="text-[11px] text-gray-500">One-off</p>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(totalOneOff)}</p>
                <p className="text-[10px] text-gray-400">last {days}d</p>
              </div>
              <div className="card">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-sprout-500" />
                  <p className="text-[11px] text-gray-500">Active bills</p>
                </div>
                <p className="text-lg font-bold text-sprout-600">{activeBills.length}</p>
              </div>
            </div>

            {/* Recurring vs One-Off comparison */}
            <section className="card">
              <h2 className="font-display font-semibold text-gray-900 mb-4">
                Recurring vs One-Off
              </h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Recurring</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(totalRecurring)}</span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-bloom-400 rounded-full transition-all duration-500"
                      style={{ width: `${(totalRecurring / maxSplit) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">One-off</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(totalOneOff)}</span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-400 rounded-full transition-all duration-500"
                      style={{ width: `${(totalOneOff / maxSplit) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                {totalSpent > 0 ? `${((totalRecurring / totalSpent) * 100).toFixed(0)}% of spending is recurring` : 'No spending data'}
              </p>
            </section>

            {/* Bills Over Time */}
            {billMonthEntries.length > 0 && (
              <section className="card">
                <h2 className="font-display font-semibold text-gray-900 mb-4">
                  Bill Payments Over Time
                </h2>
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>{formatCurrency(maxBillMonth)}</span>
                  </div>
                  <div className="flex items-end gap-1 h-32 border-b border-gray-200">
                    {billMonthEntries.map(([month, amount]) => {
                      const heightPercent = maxBillMonth > 0 ? (amount / maxBillMonth) * 100 : 0
                      return (
                        <div key={month} className="flex-1 flex flex-col items-center justify-end h-full">
                          <div
                            className="w-full rounded-t bg-bloom-400 min-h-[2px] transition-all"
                            style={{ height: `${Math.max(heightPercent, amount > 0 ? 2 : 0)}%` }}
                            title={`${month}: ${formatCurrency(amount)}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    {billMonthEntries.map(([month], i) => {
                      const d = new Date(month + '-01T00:00:00')
                      const label = d.toLocaleDateString('en-AU', { month: 'short' })
                      return (
                        <div key={month} className="flex-1 text-center">
                          <span className="text-[10px] text-gray-400">
                            {billMonthEntries.length <= 6 || i % 2 === 0 ? label : ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Individual Bill Tracking */}
            {billSpending.length > 0 && (
              <section className="card">
                <h2 className="font-display font-semibold text-gray-900 mb-4">
                  Bill Breakdown
                </h2>
                <div className="space-y-1">
                  {billSpending.map(({ bill, transactions: txns, totalPaid, categoryName }) => (
                    <div key={bill.id}>
                      <button
                        onClick={() => setExpandedBillId(expandedBillId === bill.id ? null : bill.id)}
                        className="w-full flex items-center justify-between py-2.5 border-b border-gray-50 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
                      >
                        <div className="text-left min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{bill.name}</p>
                          <p className="text-xs text-gray-400">{categoryName} &middot; {formatCurrency(Number(bill.amount))}/{bill.frequency}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <span className="text-sm font-semibold text-gray-700">{formatCurrency(totalPaid)}</span>
                          {expandedBillId === bill.id
                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                            : <ChevronDown className="w-4 h-4 text-gray-400" />
                          }
                        </div>
                      </button>
                      {expandedBillId === bill.id && txns.length > 0 && (
                        <div className="pl-3 border-l-2 border-bloom-200 ml-1 mb-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          {txns.map(t => (
                            <div key={t.id} className="flex items-center justify-between py-1.5">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-gray-600 truncate">{t.description}</p>
                                <p className="text-[10px] text-gray-400">
                                  {new Date(t.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                              <span className="text-xs font-medium text-gray-600 ml-2">{formatCurrency(Number(t.amount))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {expandedBillId === bill.id && txns.length === 0 && (
                        <p className="text-xs text-gray-400 py-2 pl-4">No payments in this period</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeBills.length === 0 && billSpending.length === 0 && (
              <div className="card text-center py-12">
                <Repeat className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">No Bills Set Up</h3>
                <p className="text-gray-500 text-sm">
                  Add bills to track your recurring payments over time.
                </p>
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}
