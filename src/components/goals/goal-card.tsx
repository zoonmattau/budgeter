'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar, CheckCircle2, CreditCard, TrendingUp } from 'lucide-react'
import { PlantVisual } from './plant-visual'
import { LikelihoodBadge } from './likelihood-badge'
import { formatCurrency, calculateLikelihood, getRequiredMonthlySavings, getDebtPayoffMetrics } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'
import type { MilestoneInfo } from '@/lib/net-worth-calculations'

interface GoalCardProps {
  goal: Tables<'goals'>
  milestoneInfo?: MilestoneInfo
}

export function GoalCard({ goal, milestoneInfo }: GoalCardProps) {
  const targetAmount = Number(goal.target_amount) || 0
  const currentAmount = Number(goal.current_amount) || 0
  const startAmount = Number(goal.starting_amount) || 0
  const isDebtPayoff = goal.goal_type === 'debt_payoff'
  const debtMetrics = isDebtPayoff ? getDebtPayoffMetrics(targetAmount, currentAmount, startAmount) : null
  const progress = isDebtPayoff
    ? (debtMetrics?.progress || 0)
    : targetAmount !== startAmount
    ? ((currentAmount - startAmount) / (targetAmount - startAmount)) * 100
    : (currentAmount >= targetAmount ? 100 : 0)
  const likelihood = milestoneInfo ? milestoneInfo.likelihood : calculateLikelihood(goal)
  const requiredMonthly = milestoneInfo ? milestoneInfo.requiredMonthlyGrowth : getRequiredMonthlySavings(goal)
  const isCompleted = goal.status === 'completed' || (isDebtPayoff && (debtMetrics?.remainingDebt || 0) <= 0.01)
  const isNetWorthMilestone = goal.goal_type === 'net_worth_milestone'
  const remainingDebt = debtMetrics?.remainingDebt || 0
  const chanceTrendPoints = milestoneInfo?.chanceTrendPoints || []
  const chanceSparklinePoints = chanceTrendPoints.length > 1
    ? chanceTrendPoints
      .map((point, index) => {
        const x = (index / (chanceTrendPoints.length - 1)) * 100
        const y = 24 - ((point.chance / 99) * 24)
        return `${x},${Math.max(0, Math.min(24, y))}`
      })
      .join(' ')
    : null

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
          ) : isNetWorthMilestone ? (
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              isCompleted ? 'bg-sprout-100' : 'bg-blue-100'
            }`}>
              {isCompleted ? (
                <CheckCircle2 className="w-8 h-8 text-sprout-600" />
              ) : (
                <TrendingUp className="w-8 h-8 text-blue-500" />
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
              {isNetWorthMilestone && !isCompleted && (
                <span className="text-xs text-blue-500 font-medium">Net Worth Milestone</span>
              )}
            </div>
            {isCompleted ? (
              <span className="badge-success flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {isDebtPayoff ? 'Paid Off' : 'Done'}
              </span>
            ) : isNetWorthMilestone && milestoneInfo && milestoneInfo.percentageChance !== null ? (
              <div className="text-right">
                <p className={`text-sm font-bold ${
                  milestoneInfo.percentageChance >= 75 ? 'text-sprout-600' :
                  milestoneInfo.percentageChance >= 40 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {milestoneInfo.percentageChance}% chance
                </p>
                {chanceSparklinePoints && (
                  <svg viewBox="0 0 100 24" className="w-20 h-5 mt-0.5 ml-auto">
                    <polyline
                      fill="none"
                      stroke={milestoneInfo.chanceChangeFromStart !== null && milestoneInfo.chanceChangeFromStart < 0 ? '#ef4444' : '#22c55e'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={chanceSparklinePoints}
                    />
                  </svg>
                )}
                {milestoneInfo.chanceChangeFromStart !== null && (
                  <p className={`text-[11px] ${
                    milestoneInfo.chanceChangeFromStart > 0
                      ? 'text-sprout-600'
                      : milestoneInfo.chanceChangeFromStart < 0
                        ? 'text-red-500'
                        : 'text-gray-500'
                  }`}>
                    {milestoneInfo.chanceChangeFromStart > 0 ? '+' : ''}
                    {Math.round(milestoneInfo.chanceChangeFromStart)} pts from start
                  </p>
                )}
              </div>
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

          {/* Progress from start for net worth milestones */}
          {isNetWorthMilestone && !isCompleted && startAmount !== 0 && currentAmount !== startAmount && (
            <p className="text-xs text-blue-500 -mt-1 mb-1">
              {currentAmount >= startAmount
                ? `+${formatCurrency(currentAmount - startAmount)} from start`
                : `${formatCurrency(currentAmount - startAmount)} from start`
              }
            </p>
          )}

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isDebtPayoff
                  ? 'bg-gradient-to-r from-red-400 to-red-500'
                  : isNetWorthMilestone
                    ? 'bg-gradient-to-r from-blue-400 to-blue-500'
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
            {isNetWorthMilestone && !isCompleted && milestoneInfo?.estimatedArrival && !goal.deadline && (
              <span className="flex items-center gap-1 text-blue-500">
                <Calendar className="w-3 h-3" />
                Est. {format(new Date(milestoneInfo.estimatedArrival), 'MMM yyyy')}
              </span>
            )}
          </div>

          {/* Required monthly savings/payment/growth hint */}
          {requiredMonthly !== null && requiredMonthly > 0 && !isCompleted && (
            <p className={`text-xs mt-2 ${isDebtPayoff ? 'text-red-600' : isNetWorthMilestone ? 'text-blue-600' : 'text-bloom-600'}`}>
              {isDebtPayoff
                ? `Pay ${formatCurrency(requiredMonthly)}/month to reach your goal`
                : isNetWorthMilestone
                  ? `Need +${formatCurrency(requiredMonthly)}/mo net worth growth`
                  : `Save ${formatCurrency(requiredMonthly)}/month to reach your goal`
              }
            </p>
          )}

          {/* Estimated arrival for milestones without deadline */}
          {isNetWorthMilestone && !isCompleted && !goal.deadline && milestoneInfo && (
            <p className="text-xs mt-1 text-blue-500">
              {milestoneInfo.estimatedArrival
                ? `On track to reach by ${format(new Date(milestoneInfo.estimatedArrival), 'MMM yyyy')} at +${formatCurrency(milestoneInfo.avgMonthlyGrowth)}/mo`
                : milestoneInfo.avgMonthlyGrowth > 0
                  ? `Growing at +${formatCurrency(milestoneInfo.avgMonthlyGrowth)}/mo`
                  : 'Net worth growth needed to reach this milestone'
              }
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
