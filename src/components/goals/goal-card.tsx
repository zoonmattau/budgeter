'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar, CheckCircle2, CreditCard } from 'lucide-react'
import { PlantVisual } from './plant-visual'
import { LikelihoodBadge } from './likelihood-badge'
import { formatCurrency, calculateLikelihood, getRequiredMonthlySavings } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'

interface GoalCardProps {
  goal: Tables<'goals'>
}

export function GoalCard({ goal }: GoalCardProps) {
  const targetAmount = Number(goal.target_amount) || 0
  const currentAmount = Number(goal.current_amount) || 0
  const progress = targetAmount > 0
    ? (currentAmount / targetAmount) * 100
    : 0
  const likelihood = calculateLikelihood(goal)
  const requiredMonthly = getRequiredMonthlySavings(goal)
  const isCompleted = goal.status === 'completed'
  const isDebtPayoff = goal.goal_type === 'debt_payoff'
  const remainingDebt = Math.max(0, targetAmount - currentAmount)

  return (
    <Link href={`/goals/${goal.id}`} className="card-hover block">
      <div className="flex gap-4">
        {/* Visual */}
        <div className="flex-shrink-0">
          {isDebtPayoff ? (
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              isCompleted ? 'bg-sprout-100' : 'bg-red-100'
            }`}>
              {isCompleted ? (
                <CheckCircle2 className="w-8 h-8 text-sprout-600" />
              ) : (
                <CreditCard className="w-8 h-8 text-red-500" />
              )}
            </div>
          ) : (
            <PlantVisual progress={progress} size="md" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-display font-semibold text-gray-900 truncate">{goal.name}</h3>
              {isDebtPayoff && !isCompleted && (
                <span className="text-xs text-red-500 font-medium">Debt Payoff</span>
              )}
            </div>
            {isCompleted ? (
              <span className="badge-success flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {isDebtPayoff ? 'Paid Off' : 'Done'}
              </span>
            ) : (
              <LikelihoodBadge likelihood={likelihood} />
            )}
          </div>

          {/* Progress - Different display for debt payoff */}
          <div className="flex items-baseline gap-2 mb-2">
            {isDebtPayoff ? (
              <>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(remainingDebt)}
                </span>
                <span className="text-sm text-gray-400">remaining</span>
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-bloom-600">
                  {formatCurrency(goal.current_amount)}
                </span>
                <span className="text-sm text-gray-400">of</span>
                <span className="text-sm font-medium text-gray-600">
                  {formatCurrency(goal.target_amount)}
                </span>
              </>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isDebtPayoff
                  ? 'bg-gradient-to-r from-red-400 to-red-500'
                  : 'bg-gradient-to-r from-sprout-400 to-sprout-500'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">
              {isDebtPayoff
                ? `${Math.round(progress)}% paid off`
                : `${Math.round(progress)}% complete`
              }
            </span>
            {goal.deadline && !isCompleted && (
              <span className="flex items-center gap-1 text-gray-500">
                <Calendar className="w-3 h-3" />
                {format(new Date(goal.deadline), 'MMM d, yyyy')}
              </span>
            )}
          </div>

          {/* Required monthly savings/payment hint */}
          {requiredMonthly !== null && requiredMonthly > 0 && !isCompleted && (
            <p className={`text-xs mt-2 ${isDebtPayoff ? 'text-red-600' : 'text-bloom-600'}`}>
              {isDebtPayoff
                ? `Pay ${formatCurrency(requiredMonthly)}/month to reach your goal`
                : `Save ${formatCurrency(requiredMonthly)}/month to reach your goal`
              }
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
