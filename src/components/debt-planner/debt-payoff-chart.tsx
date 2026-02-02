'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { MonthlyProjection } from '@/lib/debt-calculator'

interface DebtPayoffChartProps {
  projections: MonthlyProjection[]
  showIndividualDebts?: boolean
}

// Color palette for individual debts
const DEBT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
]

export function DebtPayoffChart({ projections, showIndividualDebts = false }: DebtPayoffChartProps) {
  const chartData = useMemo(() => {
    if (projections.length === 0) return { points: [], maxBalance: 0, uniqueDebts: [] }

    // Sample every month if less than 24 months, otherwise sample every 3-6 months
    const sampleRate = projections.length <= 24 ? 1 : projections.length <= 60 ? 3 : 6
    const sampledProjections = projections.filter((_, i) => i % sampleRate === 0 || i === projections.length - 1)

    const maxBalance = Math.max(...projections.map(p => p.totalBalance))
    const uniqueDebts = projections[0]?.debts.map(d => ({ id: d.id, name: d.name })) || []

    return {
      points: sampledProjections,
      maxBalance,
      uniqueDebts,
    }
  }, [projections])

  if (projections.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">No debt data to display</p>
      </div>
    )
  }

  const { points, maxBalance, uniqueDebts } = chartData
  const chartWidth = 100
  const chartHeight = 60

  // Generate SVG path for total balance
  const generatePath = (data: MonthlyProjection[], getValue: (p: MonthlyProjection) => number) => {
    if (data.length === 0) return ''

    const getX = (index: number) => (index / (data.length - 1)) * chartWidth
    const getY = (value: number) => chartHeight - (value / maxBalance) * chartHeight

    const pathPoints = data.map((p, i) => {
      const x = getX(i)
      const y = getY(getValue(p))
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')

    return pathPoints
  }

  // Generate area path (closed)
  const generateAreaPath = (data: MonthlyProjection[], getValue: (p: MonthlyProjection) => number) => {
    const linePath = generatePath(data, getValue)
    if (!linePath) return ''
    return `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`
  }

  const totalBalancePath = generatePath(points, p => p.totalBalance)
  const totalBalanceAreaPath = generateAreaPath(points, p => p.totalBalance)

  // Key milestones
  const payoffMonth = projections.length
  const halfwayMonth = projections.findIndex(p => p.totalBalance <= projections[0].totalBalance / 2) + 1

  return (
    <div className="card">
      <h3 className="font-display font-semibold text-gray-900 mb-4">Debt Payoff Timeline</h3>

      {/* Chart */}
      <div className="relative h-48 mb-4 pl-12">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          <defs>
            <linearGradient id="balanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
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

          {/* Area fill */}
          <path d={totalBalanceAreaPath} fill="url(#balanceGradient)" />

          {/* Line */}
          <path
            d={totalBalancePath}
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Paid off marker */}
          <circle
            cx={chartWidth}
            cy={chartHeight}
            r="2"
            fill="#22c55e"
          />
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-400 pr-2 text-right">
          <span>${Math.round(maxBalance / 1000)}k</span>
          <span>${Math.round(maxBalance / 2000)}k</span>
          <span>$0</span>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-gray-400 mb-4 px-1">
        <span>Now</span>
        {halfwayMonth > 0 && halfwayMonth < payoffMonth && (
          <span>{format(projections[halfwayMonth - 1]?.date || new Date(), 'MMM yyyy')}</span>
        )}
        <span className="text-sprout-600 font-medium">
          {format(projections[payoffMonth - 1]?.date || new Date(), 'MMM yyyy')}
        </span>
      </div>

      {/* Legend for individual debts */}
      {showIndividualDebts && uniqueDebts.length > 1 && (
        <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
          {uniqueDebts.map((debt, i) => (
            <div key={debt.id} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: DEBT_COLORS[i % DEBT_COLORS.length] }}
              />
              <span className="text-gray-600">{debt.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 mt-4">
        <div>
          <p className="text-xs text-gray-500">Starting Balance</p>
          <p className="text-lg font-bold text-red-600">
            {formatCurrency(projections[0]?.totalBalance || 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Debt-Free Date</p>
          <p className="text-lg font-bold text-sprout-600">
            {format(projections[payoffMonth - 1]?.date || new Date(), 'MMM yyyy')}
          </p>
        </div>
      </div>
    </div>
  )
}
