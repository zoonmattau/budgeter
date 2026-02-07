'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Target, Flame, CalendarDays } from 'lucide-react'
import { SpendingDonut } from '@/components/charts/spending-donut'
import { aggregateSpendingByCategory, getSpendingTrend } from '@/lib/chart-utils'
import { formatCurrency } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'

type Transaction = Tables<'transactions'> & {
  categories: Tables<'categories'> | null
}

interface InsightsTeaserProps {
  totalSpent?: number
  totalAllocated?: number
  totalIncome?: number
  dailyAverage?: number
  dailyTarget?: number
  discretionaryAllocated?: number
  discretionarySpent?: number
  topCategory?: { name: string; amount: number; color: string } | null
  transactions?: Transaction[]
  daysInMonth?: number
}

export function InsightsTeaser({
  totalSpent = 0,
  totalAllocated = 0,
  totalIncome = 0,
  dailyAverage = 0,
  dailyTarget = 0,
  discretionaryAllocated = 0,
  discretionarySpent = 0,
  topCategory,
  transactions = [],
  daysInMonth = new Date().getDate(),
}: InsightsTeaserProps) {
  const [activeSlide, setActiveSlide] = useState(0)

  const categoryData = aggregateSpendingByCategory(transactions, 4)
  const trend = getSpendingTrend(transactions, 7)
  const hasTransactions = transactions.length > 0

  // Build slides based on available data
  const slides: string[] = []
  if (hasTransactions) slides.push('spending')
  if (hasTransactions) slides.push('pace')
  if (topCategory && hasTransactions) slides.push('topCategory')
  if (totalAllocated > 0 && hasTransactions) slides.push('budget')

  // Computed values
  const isOnTrack = dailyAverage <= dailyTarget
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-coral-500' : trend === 'down' ? 'text-sprout-500' : 'text-gray-400'
  const trendLabel = trend === 'up' ? 'Spending up this week' : trend === 'down' ? 'Spending down this week' : 'Spending stable'

  const daysLeft = Math.max(0, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - daysInMonth)
  const budgetUsedPercent = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0
  const budgetRemaining = Math.max(0, totalAllocated - totalSpent)
  // Use discretionary budget for daily spending target (excludes rent, bills, fixed costs)
  const discretionaryRemaining = Math.max(0, discretionaryAllocated - discretionarySpent)
  const dailyBudgetRemaining = daysLeft > 0 ? discretionaryRemaining / daysLeft : 0

  // Spending streak: count consecutive days with transactions
  const today = new Date()
  let streak = 0
  if (hasTransactions) {
    const txnDates = new Set(
      transactions
        .filter(t => t.type === 'expense')
        .map(t => t.date)
    )
    for (let i = 0; i < 30; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      if (txnDates.has(dateStr)) {
        streak++
      } else if (i > 0) {
        break
      }
    }
  }

  if (!hasTransactions) {
    return (
      <Link href="/insights" className="card block hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-gray-900">Insights</h3>
          <ArrowRight className="w-4 h-4 text-gray-400" />
        </div>
        <div className="py-4 text-center">
          <p className="text-gray-400 text-sm">No spending data yet</p>
          <p className="text-xs text-gray-400 mt-1">Add transactions to see insights</p>
        </div>
      </Link>
    )
  }

  return (
    <Link href="/insights" className="card block hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-gray-900">Insights</h3>
        <ArrowRight className="w-4 h-4 text-gray-400" />
      </div>

      {/* Carousel content */}
      <div className="min-h-[120px]">
        {/* Slide: Spending breakdown */}
        {slides[activeSlide] === 'spending' && (
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-24">
              <SpendingDonut data={categoryData} height={96} showLegend={false} />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
              <p className="text-sm text-gray-500">spent this month</p>
              <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
                <TrendIcon className="w-4 h-4" />
                <span className="text-xs font-medium">{trendLabel}</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {categoryData.slice(0, 3).map((cat) => (
                  <div key={cat.name} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-[11px] text-gray-500">{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Slide: Spending pace */}
        {slides[activeSlide] === 'pace' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-bloom-100 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-bloom-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{daysLeft} days left this month</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(dailyAverage)}<span className="text-sm font-normal text-gray-400">/day</span></p>
              </div>
            </div>
            {dailyTarget > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={isOnTrack ? 'text-sprout-600 font-medium' : 'text-coral-500 font-medium'}>
                    {isOnTrack ? 'On track' : `${formatCurrency(dailyAverage - dailyTarget)}/day over`}
                  </span>
                  <span className="text-gray-400">{formatCurrency(dailyTarget)}/day target</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isOnTrack ? 'bg-sprout-400' : 'bg-coral-400'}`}
                    style={{ width: `${Math.min((dailyAverage / dailyTarget) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
            {daysLeft > 0 && discretionaryRemaining > 0 && (
              <p className="text-xs text-gray-500">
                You can spend <span className="font-medium text-gray-700">{formatCurrency(dailyBudgetRemaining)}/day</span> for the rest of the month
              </p>
            )}
          </div>
        )}

        {/* Slide: Top category */}
        {slides[activeSlide] === 'topCategory' && topCategory && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: topCategory.color + '20' }}>
                <Flame className="w-6 h-6" style={{ color: topCategory.color }} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Top spending category</p>
                <p className="text-lg font-bold text-gray-900">{topCategory.name}</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(topCategory.amount)}</span>
              {totalSpent > 0 && (
                <span className="text-sm text-gray-400">
                  ({Math.round((topCategory.amount / totalSpent) * 100)}% of spending)
                </span>
              )}
            </div>
            {streak > 1 && (
              <p className="text-xs text-gray-500">
                You&apos;ve logged expenses {streak} days in a row
              </p>
            )}
          </div>
        )}

        {/* Slide: Budget health */}
        {slides[activeSlide] === 'budget' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sprout-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-sprout-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Budget health</p>
                <p className="text-2xl font-bold text-gray-900">{budgetUsedPercent}% <span className="text-sm font-normal text-gray-400">used</span></p>
              </div>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetUsedPercent > 100 ? 'bg-red-400' : budgetUsedPercent > 80 ? 'bg-amber-400' : 'bg-sprout-400'
                }`}
                style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">{formatCurrency(totalSpent)} spent</span>
              <span className={budgetRemaining > 0 ? 'text-sprout-600 font-medium' : 'text-red-500 font-medium'}>
                {budgetRemaining > 0 ? `${formatCurrency(budgetRemaining)} left` : `${formatCurrency(Math.abs(budgetRemaining))} over`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Carousel navigation */}
      {slides.length > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={(e) => {
              e.preventDefault()
              setActiveSlide((activeSlide - 1 + slides.length) % slides.length)
            }}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.preventDefault()
                  setActiveSlide(i)
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeSlide ? 'bg-bloom-500 w-4' : 'bg-gray-300 w-1.5'
                }`}
              />
            ))}
          </div>
          <button
            onClick={(e) => {
              e.preventDefault()
              setActiveSlide((activeSlide + 1) % slides.length)
            }}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}
    </Link>
  )
}
