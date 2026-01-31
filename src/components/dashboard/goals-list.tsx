'use client'

import Link from 'next/link'
import { PlantVisual } from '@/components/goals/plant-visual'
import { LikelihoodBadge } from '@/components/goals/likelihood-badge'
import { formatCurrency, calculateLikelihood } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'

interface GoalsListProps {
  goals: Tables<'goals'>[]
}

export function GoalsList({ goals }: GoalsListProps) {
  if (goals.length === 0) {
    return (
      <div className="card text-center py-8">
        <div className="w-12 h-12 rounded-full bg-bloom-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-bloom-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <p className="text-gray-600 font-medium mb-1">No goals yet</p>
        <p className="text-gray-400 text-sm mb-4">Create your first savings goal</p>
        <Link href="/goals/new" className="btn-primary inline-flex">
          Add Goal
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {goals.map((goal) => {
        const progress = goal.target_amount > 0
          ? (goal.current_amount / goal.target_amount) * 100
          : 0
        const likelihood = calculateLikelihood(goal)

        return (
          <Link
            key={goal.id}
            href={`/goals/${goal.id}`}
            className="card-hover flex items-center gap-4"
          >
            {/* Plant Visual */}
            <div className="w-16 h-16 flex-shrink-0">
              <PlantVisual progress={progress} size="sm" />
            </div>

            {/* Goal Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-gray-900 truncate">{goal.name}</h3>
                <LikelihoodBadge likelihood={likelihood} />
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-bloom-600 font-semibold">
                  {formatCurrency(goal.current_amount)}
                </span>
                <span className="text-gray-400">of</span>
                <span className="text-gray-600">
                  {formatCurrency(goal.target_amount)}
                </span>
              </div>

              {/* Mini progress bar */}
              <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sprout-400 to-sprout-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
