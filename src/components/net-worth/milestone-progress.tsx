'use client'

import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

interface MilestoneProgressProps {
  currentNetWorth: number
  nextMilestone: number
  milestoneName: string
  projectedArrivalDate: string | null
  avgMonthlyChange: number
  lowestNetWorth?: number
}

export function MilestoneProgress({
  currentNetWorth,
  nextMilestone,
  milestoneName,
  projectedArrivalDate,
  avgMonthlyChange,
  lowestNetWorth,
}: MilestoneProgressProps) {
  const isDebtFree = nextMilestone === 0 && currentNetWorth < 0

  let progressPct: number
  if (isDebtFree) {
    // For debt-free milestone: measure progress from lowest point toward $0
    const startingDebt = lowestNetWorth !== undefined ? Math.min(lowestNetWorth, currentNetWorth) : currentNetWorth
    if (startingDebt >= 0) {
      progressPct = 100
    } else {
      // How much of the journey from startingDebt to $0 has been covered
      const totalJourney = Math.abs(startingDebt)
      const covered = totalJourney - Math.abs(currentNetWorth)
      progressPct = Math.round(Math.max(0, Math.min((covered / totalJourney) * 100, 100)))
    }
  } else if (currentNetWorth >= 0 && nextMilestone > 0) {
    progressPct = Math.round(Math.min((currentNetWorth / nextMilestone) * 100, 100))
  } else {
    progressPct = 0
  }

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
        {isDebtFree ? (
          <>
            <span>{formatCurrency(currentNetWorth)}</span>
            <span>{formatCurrency(0)}</span>
          </>
        ) : (
          <>
            <span>{formatCurrency(Math.max(0, currentNetWorth))}</span>
            <span>{formatCurrency(nextMilestone)}</span>
          </>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-3">{arrivalLabel}</p>
    </div>
  )
}
