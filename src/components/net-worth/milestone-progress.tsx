'use client'

import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

interface MilestoneProgressProps {
  currentNetWorth: number
  nextMilestone: number
  milestoneName: string
  projectedArrivalDate: string | null
  avgMonthlyChange: number
}

export function MilestoneProgress({
  currentNetWorth,
  nextMilestone,
  milestoneName,
  projectedArrivalDate,
  avgMonthlyChange,
}: MilestoneProgressProps) {
  // For negative net worth heading to $0, progress is based on how far from 0
  // For positive milestones, progress is current / target
  const progressBase = nextMilestone === 0
    ? Math.max(0, 1 - Math.abs(currentNetWorth) / Math.abs(currentNetWorth + Math.abs(currentNetWorth)))
    : currentNetWorth >= 0
      ? Math.min((currentNetWorth / nextMilestone) * 100, 100)
      : 0

  const progressPct = Math.round(progressBase)

  const arrivalLabel = (() => {
    if (avgMonthlyChange <= 0) return 'Start growing to unlock projections'
    if (!projectedArrivalDate) return '5+ years away'
    return `At this rate, you'll reach ${milestoneName} by ${format(new Date(projectedArrivalDate), 'MMMM yyyy')}`
  })()

  return (
    <div className="card">
      <p className="text-sm font-medium text-gray-900">
        You&apos;re {progressPct}% of the way to {milestoneName}!
      </p>

      <div className="mt-3 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-bloom-400 to-sprout-400 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <span>{formatCurrency(Math.max(0, currentNetWorth))}</span>
        <span>{formatCurrency(nextMilestone)}</span>
      </div>

      <p className="text-xs text-gray-500 mt-3">{arrivalLabel}</p>
    </div>
  )
}
