'use client'

import Link from 'next/link'
import { AlertTriangle, CreditCard, TrendingDown, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'

interface CreditLimitWarningProps {
  creditCards: Tables<'accounts'>[]
}

export function CreditLimitWarning({ creditCards }: CreditLimitWarningProps) {
  // Find cards near or over limit
  const warningCards = creditCards.filter(card => {
    if (!card.credit_limit || card.credit_limit <= 0) return false
    const utilization = (card.balance / card.credit_limit) * 100
    return utilization >= 75
  })

  if (warningCards.length === 0) return null

  // Sort by utilization (highest first)
  warningCards.sort((a, b) => {
    const aUtil = (a.balance / (a.credit_limit || 1)) * 100
    const bUtil = (b.balance / (b.credit_limit || 1)) * 100
    return bUtil - aUtil
  })

  const worstCard = warningCards[0]
  const worstUtilization = Math.round((worstCard.balance / (worstCard.credit_limit || 1)) * 100)
  const isOverLimit = worstUtilization >= 100

  // Mitigation strategies
  const strategies = [
    { text: 'Pay more than minimum', icon: TrendingDown },
    { text: 'Transfer balance to 0% card', icon: CreditCard },
    { text: 'Reduce discretionary spending', icon: ArrowRight },
  ]

  return (
    <div className={`card ${isOverLimit ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isOverLimit ? 'bg-red-100' : 'bg-amber-100'
        }`}>
          <AlertTriangle className={`w-5 h-5 ${isOverLimit ? 'text-red-600' : 'text-amber-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${isOverLimit ? 'text-red-800' : 'text-amber-800'}`}>
            {isOverLimit ? 'Credit Limit Exceeded' : 'Approaching Credit Limit'}
          </p>
          <p className={`text-sm mt-0.5 ${isOverLimit ? 'text-red-700' : 'text-amber-700'}`}>
            {worstCard.name} is at {worstUtilization}% ({formatCurrency(worstCard.balance)} of {formatCurrency(worstCard.credit_limit || 0)})
          </p>

          {warningCards.length > 1 && (
            <p className={`text-xs mt-1 ${isOverLimit ? 'text-red-600' : 'text-amber-600'}`}>
              +{warningCards.length - 1} more card{warningCards.length > 2 ? 's' : ''} near limit
            </p>
          )}

          {/* Mitigation tips */}
          <div className="mt-3 pt-3 border-t border-amber-200/50">
            <p className={`text-xs font-medium mb-2 ${isOverLimit ? 'text-red-700' : 'text-amber-700'}`}>
              To reduce utilization:
            </p>
            <div className="space-y-1">
              {strategies.slice(0, 2).map((strategy, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs ${isOverLimit ? 'text-red-600' : 'text-amber-600'}`}>
                  <strategy.icon className="w-3 h-3" />
                  <span>{strategy.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/net-worth"
        className={`mt-3 block text-center py-2 rounded-lg text-sm font-medium transition-colors ${
          isOverLimit
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
        }`}
      >
        View Credit Cards
      </Link>
    </div>
  )
}
