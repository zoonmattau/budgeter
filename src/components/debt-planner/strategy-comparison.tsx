'use client'

import { TrendingDown, Trophy, Clock, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { formatPayoffTime, type PayoffStrategy } from '@/lib/debt-calculator'

interface StrategyComparisonProps {
  avalanche: { months: number; totalInterest: number }
  snowball: { months: number; totalInterest: number }
  selectedStrategy: PayoffStrategy
  onStrategyChange: (strategy: PayoffStrategy) => void
}

export function StrategyComparison({
  avalanche,
  snowball,
  selectedStrategy,
  onStrategyChange,
}: StrategyComparisonProps) {
  const interestSaved = snowball.totalInterest - avalanche.totalInterest
  const timeDifference = snowball.months - avalanche.months

  return (
    <div className="card">
      <h3 className="font-display font-semibold text-gray-900 mb-4">Choose Your Strategy</h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Avalanche Strategy */}
        <button
          onClick={() => onStrategyChange('avalanche')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${
            selectedStrategy === 'avalanche'
              ? 'border-bloom-500 bg-bloom-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className={`w-5 h-5 ${selectedStrategy === 'avalanche' ? 'text-bloom-600' : 'text-gray-400'}`} />
            <span className={`font-semibold ${selectedStrategy === 'avalanche' ? 'text-bloom-700' : 'text-gray-700'}`}>
              Avalanche
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">Pay highest interest first</p>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-600">{formatPayoffTime(avalanche.months)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <DollarSign className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-600">{formatCurrency(avalanche.totalInterest)} interest</span>
            </div>
          </div>

          {selectedStrategy === 'avalanche' && (
            <div className="mt-3 pt-2 border-t border-bloom-200">
              <span className="text-xs font-medium text-bloom-600">Selected</span>
            </div>
          )}
        </button>

        {/* Snowball Strategy */}
        <button
          onClick={() => onStrategyChange('snowball')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${
            selectedStrategy === 'snowball'
              ? 'border-sprout-500 bg-sprout-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Trophy className={`w-5 h-5 ${selectedStrategy === 'snowball' ? 'text-sprout-600' : 'text-gray-400'}`} />
            <span className={`font-semibold ${selectedStrategy === 'snowball' ? 'text-sprout-700' : 'text-gray-700'}`}>
              Snowball
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">Pay smallest balance first</p>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-600">{formatPayoffTime(snowball.months)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <DollarSign className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-600">{formatCurrency(snowball.totalInterest)} interest</span>
            </div>
          </div>

          {selectedStrategy === 'snowball' && (
            <div className="mt-3 pt-2 border-t border-sprout-200">
              <span className="text-xs font-medium text-sprout-600">Selected</span>
            </div>
          )}
        </button>
      </div>

      {/* Comparison insight */}
      {interestSaved > 0 && (
        <div className="p-3 bg-amber-50 rounded-xl">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Avalanche saves {formatCurrency(interestSaved)}</span> in interest
            {timeDifference > 0 && ` and ${timeDifference} month${timeDifference > 1 ? 's' : ''}`}
            , but Snowball gives you quicker wins to stay motivated.
          </p>
        </div>
      )}

      {/* Strategy descriptions */}
      <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Avalanche Method</p>
          <p className="text-xs text-gray-500">
            Mathematically optimal. Pay minimums on all debts, put extra money toward the debt with the highest interest rate.
            Saves the most money over time.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Snowball Method</p>
          <p className="text-xs text-gray-500">
            Psychologically motivating. Pay minimums on all debts, put extra money toward the smallest balance.
            Quick wins help you stay committed.
          </p>
        </div>
      </div>
    </div>
  )
}
