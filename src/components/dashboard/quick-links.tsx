'use client'

import Link from 'next/link'
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { SpendingDonut } from '@/components/charts/spending-donut'
import { aggregateSpendingByCategory, getSpendingTrend } from '@/lib/chart-utils'
import { formatCurrency } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'

type Transaction = Tables<'transactions'> & {
  categories: Tables<'categories'> | null
}

interface InsightsTeaserProps {
  totalSpent?: number
  dailyAverage?: number
  dailyTarget?: number
  topCategory?: { name: string; amount: number; color: string }
  transactions?: Transaction[]
}

export function InsightsTeaser({
  totalSpent = 0,
  dailyAverage = 0,
  dailyTarget = 0,
  topCategory: _topCategory,
  transactions = []
}: InsightsTeaserProps) {
  const isOnTrack = dailyAverage <= dailyTarget

  // Get top 4 categories for donut chart
  const categoryData = aggregateSpendingByCategory(transactions, 4)
  const trend = getSpendingTrend(transactions, 7)

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-coral-500' : trend === 'down' ? 'text-sprout-500' : 'text-gray-400'
  const trendLabel = trend === 'up' ? 'Spending up' : trend === 'down' ? 'Spending down' : 'Stable'

  const hasTransactions = transactions.length > 0

  return (
    <Link href="/insights" className="card block hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-gray-900">Insights</h3>
        <ArrowRight className="w-4 h-4 text-gray-400" />
      </div>

      {hasTransactions ? (
        <>
          <div className="flex items-center gap-4">
            {/* Donut chart */}
            <div className="flex-shrink-0 w-24">
              <SpendingDonut data={categoryData} height={96} showLegend={false} />
            </div>

            {/* Stats */}
            <div className="flex-1">
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
              <p className="text-sm text-gray-500">spent this month</p>

              <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
                <TrendIcon className="w-4 h-4" />
                <span className="text-xs font-medium">{trendLabel}</span>
              </div>
            </div>
          </div>

          {/* Category legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-gray-100">
            {categoryData.map((cat) => (
              <div key={cat.name} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-xs text-gray-600 truncate">{cat.name}</span>
              </div>
            ))}
          </div>

          {dailyTarget > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Daily average</span>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${isOnTrack ? 'text-sprout-600' : 'text-coral-500'}`}>
                    {formatCurrency(dailyAverage)}
                  </span>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-500">{formatCurrency(dailyTarget)} target</span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="py-4 text-center">
          <p className="text-gray-400 text-sm">No spending data yet</p>
          <p className="text-xs text-gray-400 mt-1">Add transactions to see insights</p>
        </div>
      )}
    </Link>
  )
}
