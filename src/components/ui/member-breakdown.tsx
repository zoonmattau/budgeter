'use client'

import { getMemberColorHex } from '@/lib/scope-context'

export interface MemberSpending {
  userId: string
  displayName: string | null
  amount: number
}

interface MemberBreakdownProps {
  breakdown: MemberSpending[]
  total?: number
  showLegend?: boolean
  showAmounts?: boolean
  className?: string
}

export function MemberBreakdown({
  breakdown,
  total: providedTotal,
  showLegend = true,
  showAmounts = true,
  className = '',
}: MemberBreakdownProps) {
  const total = providedTotal ?? breakdown.reduce((sum, m) => sum + m.amount, 0)

  if (total === 0 || breakdown.length === 0) {
    return null
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Stacked bar */}
      <div className="h-3 rounded-full overflow-hidden flex bg-gray-100">
        {breakdown.map((member, index) => {
          const percentage = (member.amount / total) * 100
          if (percentage <= 0) return null

          return (
            <div
              key={member.userId}
              className="h-full transition-all relative group"
              style={{
                width: `${percentage}%`,
                backgroundColor: getMemberColorHex(index),
              }}
              title={`${member.displayName || 'Unknown'}: ${percentage.toFixed(0)}%`}
            >
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {member.displayName || 'Unknown'}: {percentage.toFixed(0)}%
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {breakdown.map((member, index) => {
            if (member.amount <= 0) return null

            return (
              <div key={member.userId} className="flex items-center gap-1.5 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getMemberColorHex(index) }}
                />
                <span className="text-gray-700">
                  {member.displayName || 'Unknown'}
                  {showAmounts && (
                    <span className="text-gray-500 ml-1">
                      ${member.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Compact inline version for tooltips
export function MemberBreakdownInline({
  breakdown,
}: {
  breakdown: MemberSpending[]
}) {
  return (
    <div className="space-y-1">
      {breakdown.map((member, index) => (
        <div key={member.userId} className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getMemberColorHex(index) }}
            />
            <span>{member.displayName || 'Unknown'}</span>
          </div>
          <span className="font-medium">
            ${member.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  )
}
