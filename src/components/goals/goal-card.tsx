'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar, CheckCircle2 } from 'lucide-react'
import { PlantVisual } from './plant-visual'
import { LikelihoodBadge } from './likelihood-badge'
import { formatCurrency, calculateLikelihood, getRequiredMonthlySavings } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'

interface GoalCardProps {
  goal: Tables<'goals'>
}

export function GoalCard({ goal }: GoalCardProps) {
  const progress = goal.target_amount > 0
    ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100
    : 0
  const likelihood = calculateLikelihood(goal)
  const requiredMonthly = getRequiredMonthlySavings(goal)
  const isCompleted = goal.status === 'completed'

  return (
    <Link href={`/goals/${goal.id}`} className="card-hover block">
      <div className="flex gap-4">
        {/* Plant Visual */}
        <div className="flex-shrink-0">
          <PlantVisual progress={progress} size="md" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-display font-semibold text-gray-900 truncate">{goal.name}</h3>
            {isCompleted ? (
              <span className="badge-success flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Done
              </span>
            ) : (
              <LikelihoodBadge likelihood={likelihood} />
            )}
          </div>

          {/* Progress */}
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-lg font-bold text-bloom-600">
              {formatCurrency(goal.current_amount)}
            </span>
            <span className="text-sm text-gray-400">of</span>
            <span className="text-sm font-medium text-gray-600">
              {formatCurrency(goal.target_amount)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-sprout-400 to-sprout-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">{Math.round(progress)}% complete</span>
            {goal.deadline && !isCompleted && (
              <span className="flex items-center gap-1 text-gray-500">
                <Calendar className="w-3 h-3" />
                {format(new Date(goal.deadline), 'MMM d, yyyy')}
              </span>
            )}
          </div>

          {/* Required monthly savings hint */}
          {requiredMonthly !== null && requiredMonthly > 0 && !isCompleted && (
            <p className="text-xs text-bloom-600 mt-2">
              Save {formatCurrency(requiredMonthly)}/month to reach your goal
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
