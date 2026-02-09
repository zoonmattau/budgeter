'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface MomentumCardProps {
  monthlyChange: number
  lastMonthChange: number | null
  netWorth: number
}

export function MomentumCard({ monthlyChange, lastMonthChange }: MomentumCardProps) {
  const isPositive = monthlyChange >= 0
  const isImproving = lastMonthChange !== null && monthlyChange > lastMonthChange

  return (
    <div className={`card ${isPositive ? 'bg-gradient-to-br from-sprout-50 to-emerald-50' : 'bg-gradient-to-br from-red-50 to-coral-50'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">This month</p>
          <p className={`text-2xl font-bold ${isPositive ? 'text-sprout-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{formatCurrency(monthlyChange)}
          </p>
          {lastMonthChange !== null && (
            <p className="text-xs text-gray-500 mt-1">
              vs {lastMonthChange >= 0 ? '+' : ''}{formatCurrency(lastMonthChange)} last month
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isPositive ? 'bg-sprout-100' : 'bg-red-100'
          }`}>
            {isPositive ? (
              <TrendingUp className="w-5 h-5 text-sprout-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
          </div>
          {isImproving && (
            <span className="text-xs font-medium text-sprout-600">Picking up pace!</span>
          )}
        </div>
      </div>
    </div>
  )
}
