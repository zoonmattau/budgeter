'use client'

import { differenceInDays } from 'date-fns'
import { Zap, Clock, CheckCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'

type Challenge = Tables<'challenges'>

function formatProgress(challenge: Challenge): string {
  if (challenge.type === 'streak' || challenge.type === 'no_spend_day') {
    return `${challenge.current_value} / ${challenge.target_value} days`
  }
  return `${formatCurrency(challenge.current_value)} / ${formatCurrency(challenge.target_value)}`
}

interface ActiveChallengeProps {
  challenge: Challenge
}

export function ActiveChallenge({ challenge }: ActiveChallengeProps) {
  const progress = challenge.target_value > 0
    ? (challenge.current_value / challenge.target_value) * 100
    : 0
  const daysLeft = differenceInDays(new Date(challenge.end_date + 'T00:00:00'), new Date())
  const isComplete = challenge.status === 'completed'

  if (isComplete) {
    return (
      <div className="card bg-gradient-to-br from-sprout-50 to-green-50 border border-sprout-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sprout-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-4 h-4 text-sprout-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sprout-600 uppercase tracking-wide">Completed!</p>
            <h3 className="font-semibold text-gray-900 truncate">{challenge.title}</h3>
          </div>
          <span className="text-sm font-bold text-sprout-600 flex-shrink-0">+{challenge.reward_xp} XP</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-gradient-to-br from-coral-50 to-amber-50 border border-coral-100">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-coral-100 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-coral-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-coral-600 uppercase tracking-wide">Weekly Challenge</p>
            <h3 className="font-semibold text-gray-900">{challenge.title}</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold text-amber-600">+{challenge.reward_xp} XP</span>
          <div className="flex items-center gap-1 text-xs text-gray-500 bg-white/60 rounded-full px-2 py-1">
            <Clock className="w-3 h-3" />
            <span>{Math.max(0, daysLeft)}d left</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3">{challenge.description}</p>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="h-2 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-coral-400 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
        <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
          {formatProgress(challenge)}
        </span>
      </div>
    </div>
  )
}
