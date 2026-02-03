'use client'

import Link from 'next/link'
import { TrendingUp, TrendingDown, ArrowRight, Calculator } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface NetWorthCardProps {
  netWorth: number
  totalAssets: number
  totalLiabilities: number
}

export function NetWorthCard({ netWorth, totalAssets, totalLiabilities }: NetWorthCardProps) {
  const isPositive = netWorth >= 0

  return (
    <div className="space-y-2">
      <Link
        href="/net-worth"
        className={`card-hover block p-4 ${
          isPositive
            ? 'bg-gradient-to-br from-sprout-50 to-bloom-50'
            : 'bg-gradient-to-br from-red-50 to-coral-50'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-600">Net Worth</p>
          <ArrowRight className="w-4 h-4 text-gray-400" />
        </div>

        <p className={`text-2xl font-bold ${isPositive ? 'text-sprout-600' : 'text-red-600'}`}>
          {formatCurrency(netWorth)}
        </p>

        <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100/50">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-sprout-500" />
            <span className="text-xs text-gray-600">{formatCurrency(totalAssets)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-gray-600">{formatCurrency(totalLiabilities)}</span>
          </div>
        </div>
      </Link>

      {/* Debt planner link when net worth is negative */}
      {!isPositive && totalLiabilities > 0 && (
        <Link
          href="/debt-planner"
          className="flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Plan your debt payoff</span>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-600" />
        </Link>
      )}
    </div>
  )
}
