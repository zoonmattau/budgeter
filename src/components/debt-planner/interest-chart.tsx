'use client'

import { useMemo } from 'react'
import { formatCurrency } from '@/lib/utils'
import type { MonthlyProjection } from '@/lib/debt-calculator'

interface InterestChartProps {
  projections: MonthlyProjection[]
  comparisonProjections?: MonthlyProjection[] // For comparing strategies
  label?: string
  comparisonLabel?: string
}

export function InterestChart({
  projections,
  comparisonProjections,
  label = 'Your Plan',
  comparisonLabel = 'Alternative',
}: InterestChartProps) {
  const chartData = useMemo(() => {
    if (projections.length === 0) return { points: [], maxInterest: 0 }

    // Sample rate for performance
    const sampleRate = projections.length <= 24 ? 1 : projections.length <= 60 ? 3 : 6
    const sampledProjections = projections.filter((_, i) => i % sampleRate === 0 || i === projections.length - 1)
    const sampledComparison = comparisonProjections?.filter((_, i) => i % sampleRate === 0 || i === (comparisonProjections?.length || 0) - 1)

    const allInterestValues = [
      ...projections.map(p => p.cumulativeInterest),
      ...(comparisonProjections?.map(p => p.cumulativeInterest) || []),
    ]
    const maxInterest = Math.max(...allInterestValues)

    return {
      points: sampledProjections,
      comparisonPoints: sampledComparison,
      maxInterest,
    }
  }, [projections, comparisonProjections])

  if (projections.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">No interest data to display</p>
      </div>
    )
  }

  const { points, comparisonPoints, maxInterest } = chartData
  const chartWidth = 100
  const chartHeight = 50

  const totalInterest = projections[projections.length - 1]?.cumulativeInterest || 0
  const comparisonTotalInterest = comparisonProjections?.[comparisonProjections.length - 1]?.cumulativeInterest

  // Generate SVG path
  const generatePath = (data: MonthlyProjection[], maxX: number) => {
    if (data.length === 0) return ''

    const getX = (index: number) => (index / (maxX - 1)) * chartWidth
    const getY = (value: number) => chartHeight - (value / maxInterest) * chartHeight

    return data.map((p, i) => {
      const x = getX(i * (maxX / data.length))
      const y = getY(p.cumulativeInterest)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  }

  const maxLength = Math.max(points.length, comparisonPoints?.length || 0)
  const primaryPath = generatePath(points, maxLength)
  const comparisonPath = comparisonPoints ? generatePath(comparisonPoints, maxLength) : ''

  return (
    <div className="card">
      <h3 className="font-display font-semibold text-gray-900 mb-4">Cumulative Interest Paid</h3>

      {/* Chart */}
      <div className="relative h-32 mb-4 pl-12">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 0.5, 1].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              y1={chartHeight * (1 - ratio)}
              x2={chartWidth}
              y2={chartHeight * (1 - ratio)}
              stroke="#e5e7eb"
              strokeWidth="0.5"
            />
          ))}

          {/* Comparison line (if exists) */}
          {comparisonPath && (
            <path
              d={comparisonPath}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3,3"
              strokeLinecap="round"
            />
          )}

          {/* Primary line */}
          <path
            d={primaryPath}
            fill="none"
            stroke="#f97316"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* End markers */}
          <circle
            cx={chartWidth}
            cy={chartHeight - (totalInterest / maxInterest) * chartHeight}
            r="2"
            fill="#f97316"
          />
          {comparisonTotalInterest !== undefined && comparisonPoints && (
            <circle
              cx={chartWidth}
              cy={chartHeight - (comparisonTotalInterest / maxInterest) * chartHeight}
              r="2"
              fill="#94a3b8"
            />
          )}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-400 pr-2 text-right">
          <span>${maxInterest >= 1000 ? Math.round(maxInterest / 1000) + 'k' : Math.round(maxInterest)}</span>
          <span>$0</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-4 h-0.5 bg-orange-500 rounded" />
          <span className="text-gray-600">{label}</span>
        </div>
        {comparisonProjections && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-0.5 bg-slate-400 rounded border-dashed" style={{ borderStyle: 'dashed' }} />
            <span className="text-gray-600">{comparisonLabel}</span>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500">Total Interest ({label})</p>
          <p className="text-lg font-bold text-orange-600">
            {formatCurrency(totalInterest)}
          </p>
        </div>
        {comparisonTotalInterest !== undefined && (
          <div>
            <p className="text-xs text-gray-500">Total Interest ({comparisonLabel})</p>
            <p className="text-lg font-bold text-gray-600">
              {formatCurrency(comparisonTotalInterest)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
