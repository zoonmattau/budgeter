'use client'

import Link from 'next/link'
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { SpendingDonut } from '@/components/charts/spending-donut'
import { aggregateSpendingByCategory, getSpendingTrend } from '@/lib/chart-utils'
import { formatCurrency } from '@/lib/utils'
import { MemberBreakdown, MemberSpending } from '@/components/ui/member-breakdown'
import type { Tables } from '@/lib/database.types'
import type { ViewScope, HouseholdMember } from '@/lib/scope-context'

type Transaction = Tables<'transactions'> & {
  categories: Tables<'categories'> | null
  profiles?: { display_name: string | null } | null
}

interface SpendingSnapshotProps {
  transactions: Transaction[]
  scope?: ViewScope
  members?: HouseholdMember[]
  currentUserId?: string
}

export function SpendingSnapshot({
  transactions,
  scope = 'personal',
  members = [],
  currentUserId,
}: SpendingSnapshotProps) {
  // Get top 3 categories for mini donut
  const categoryData = aggregateSpendingByCategory(transactions, 3)
  const trend = getSpendingTrend(transactions, 7)

  const totalSpent = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-sprout-500' : 'text-gray-400'
  const trendLabel = trend === 'up' ? 'Spending up' : trend === 'down' ? 'Spending down' : 'Stable'

  const isHousehold = scope === 'household'

  // Calculate member breakdown for household view
  let memberBreakdown: MemberSpending[] = []
  if (isHousehold && members.length > 0) {
    const spendingByUser = new Map<string, number>()
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const current = spendingByUser.get(t.user_id) || 0
        spendingByUser.set(t.user_id, current + Number(t.amount))
      })

    memberBreakdown = members.map(member => ({
      userId: member.user_id,
      displayName: member.user_id === currentUserId ? 'You' : member.display_name,
      amount: spendingByUser.get(member.user_id) || 0,
    }))
  }

  if (transactions.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-gray-900">
            {isHousehold ? 'Household Spending' : 'Spending'}
          </h2>
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
        <h2 className="font-display font-semibold text-gray-900">
          {isHousehold ? 'Household Spending' : 'Spending'}
        </h2>
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

      {/* Member breakdown for household view */}
      {isHousehold && memberBreakdown.length > 0 && totalSpent > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">By member</p>
          <MemberBreakdown
            breakdown={memberBreakdown}
            total={totalSpent}
            showLegend={true}
            showAmounts={true}
          />
        </div>
      )}
    </div>
  )
}
