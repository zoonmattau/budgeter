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

interface SpendingSnapshotProps {
  transactions: Transaction[]
}

export function SpendingSnapshot({ transactions }: SpendingSnapshotProps) {
  // Get top 3 categories for mini donut
  const categoryData = aggregateSpendingByCategory(transactions, 3)
  const trend = getSpendingTrend(transactions, 7)

  const totalSpent = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-sprout-500' : 'text-gray-400'
  const trendLabel = trend === 'up' ? 'Spending up' : trend === 'down' ? 'Spending down' : 'Stable'

  if (transactions.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-gray-900">Spending</h2>
          <Link href="/insights" className="text-sm text-bloom-600 hover:text-bloom-700 font-medium flex items-center gap-1">
            View insights
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <p className="text-gray-400 text-sm text-center py-6">No transactions yet</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-gray-900">Spending</h2>
        <Link href="/insights" className="text-sm text-bloom-600 hover:text-bloom-700 font-medium flex items-center gap-1">
          View insights
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Mini donut */}
        <div className="flex-shrink-0 w-24">
          <SpendingDonut data={categoryData} height={96} showLegend={false} />
        </div>

        {/* Stats */}
        <div className="flex-1">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
          <p className="text-sm text-gray-500">this month</p>

          <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-xs font-medium">{trendLabel}</span>
          </div>
        </div>
      </div>

      {/* Category legend */}
      <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
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
    </div>
  )
}
