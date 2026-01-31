'use client'

import { differenceInDays } from 'date-fns'
import { Zap, Target, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'

type ChallengeWithGoal = Tables<'challenges'> & {
  goals: Tables<'goals'> | null
}

interface ActiveChallengeProps {
  challenge: ChallengeWithGoal
}

export function ActiveChallenge({ challenge }: ActiveChallengeProps) {
  const progress = challenge.target_value > 0
    ? (challenge.current_value / challenge.target_value) * 100
    : 0
  const daysLeft = differenceInDays(new Date(challenge.end_date), new Date())

  return (
    <div className="card bg-gradient-to-br from-coral-50 to-amber-50 border-coral-100">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-coral-100 flex items-center justify-center">
            <Zap className="w-4 h-4 text-coral-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-coral-600 uppercase tracking-wide">Active Challenge</p>
            <h3 className="font-semibold text-gray-900">{challenge.title}</h3>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 bg-white/60 rounded-full px-2 py-1">
          <Clock className="w-3 h-3" />
          <span>{daysLeft}d left</span>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3">{challenge.description}</p>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="h-2 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-coral-400 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
        <span className="text-sm font-semibold text-gray-700">
          {formatCurrency(challenge.current_value)} / {formatCurrency(challenge.target_value)}
        </span>
      </div>

      {/* Linked goal */}
      {challenge.goals && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-coral-100/50">
          <Target className="w-4 h-4 text-bloom-500" />
          <span className="text-sm text-gray-600">
            Contributing to: <span className="font-medium text-bloom-600">{challenge.goals.name}</span>
          </span>
        </div>
      )}
    </div>
  )
}
