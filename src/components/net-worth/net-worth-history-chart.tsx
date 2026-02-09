'use client'

import { useState } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { ChartWrapper } from '@/components/charts/chart-wrapper'
import { formatCompactCurrency } from '@/lib/utils'

interface NetWorthHistoryChartProps {
  data: {
    snapshot_date: string
    net_worth: number
    total_assets: number
    total_liabilities: number
  }[]
  projectionData?: { date: string; projectedNetWorth: number }[]
  nextMilestone?: { amount: number; name: string }
  goals?: { id: string; name: string; target_amount: number; goal_type: string }[]
  height?: number
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL'

interface ChartPoint {
  date: string
  label: string
  netWorth?: number
  projectedNetWorth?: number
}

export function NetWorthHistoryChart({
  data,
  projectionData,
  nextMilestone,
  goals,
  height = 250,
}: NetWorthHistoryChartProps) {
  const [range, setRange] = useState<TimeRange>('3M')

  const filteredData = filterDataByRange(data, range)

  const historicalPoints: ChartPoint[] = filteredData.map((d) => ({
    date: d.snapshot_date,
    netWorth: Number(d.net_worth),
    label: formatDateLabel(d.snapshot_date),
  }))

  if (historicalPoints.length === 0) {
    return (
      <div className="space-y-4">
        <TimeRangeSelector range={range} setRange={setRange} />
        <div
          className="flex items-center justify-center bg-gray-50 rounded-xl"
          style={{ height }}
        >
          <p className="text-gray-400 text-sm">No history data yet</p>
        </div>
      </div>
    )
  }

  // Build merged dataset: historical + projection
  const chartData: ChartPoint[] = [...historicalPoints]

  // Bridge: last historical point also gets projectedNetWorth so lines connect
  if (projectionData && projectionData.length > 0 && chartData.length > 0) {
    const lastHistorical = chartData[chartData.length - 1]
    lastHistorical.projectedNetWorth = lastHistorical.netWorth

    for (const p of projectionData) {
      chartData.push({
        date: p.date,
        label: formatDateLabel(p.date),
        projectedNetWorth: p.projectedNetWorth,
      })
    }
  }

  // Collect all values for domain calculation
  const allValues = chartData.flatMap((d) => {
    const vals: number[] = []
    if (d.netWorth !== undefined) vals.push(d.netWorth)
    if (d.projectedNetWorth !== undefined) vals.push(d.projectedNetWorth)
    return vals
  })

  // Include milestone and goal values in domain
  const referenceValues: number[] = []
  if (nextMilestone) referenceValues.push(nextMilestone.amount)
  const currentNetWorth = historicalPoints[historicalPoints.length - 1]?.netWorth ?? 0
  if (goals) {
    for (const g of goals) {
      if (g.goal_type === 'savings' && Number(g.target_amount) <= currentNetWorth * 3 && Number(g.target_amount) > 0) {
        referenceValues.push(Number(g.target_amount))
      }
    }
  }

  const minValue = Math.min(...allValues, ...referenceValues)
  const maxValue = Math.max(...allValues, ...referenceValues)
  const isCurrentlyNegative = currentNetWorth < 0

  const { domainMin, domainMax, ticks } = calculateNiceScale(minValue, maxValue)

  return (
    <div className="space-y-4">
      <TimeRangeSelector range={range} setRange={setRange} />
      <ChartWrapper height={height}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="netWorthGradientNegative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            interval="preserveStartEnd"
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={(value) => formatCompactCurrency(value)}
            domain={[domainMin, domainMax]}
            ticks={ticks}
            width={65}
          />

          <Tooltip
            formatter={(value, name) => {
              const label = name === 'projectedNetWorth' ? 'Projected' : 'Net Worth'
              return [`$${Number(value).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, label]
            }}
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              padding: '8px 12px',
            }}
            labelStyle={{ fontWeight: 600 }}
          />

          {/* Zero reference line */}
          <ReferenceLine
            y={0}
            stroke="#9ca3af"
            strokeDasharray="3 3"
            strokeWidth={1}
          />

          {/* Milestone reference line */}
          {nextMilestone && (
            <ReferenceLine
              y={nextMilestone.amount}
              stroke="#a855f7"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: nextMilestone.name,
                position: 'insideTopLeft',
                fill: '#a855f7',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          )}

          {/* Goal reference lines */}
          {goals?.filter(g =>
            g.goal_type === 'savings' &&
            Number(g.target_amount) > currentNetWorth &&
            Number(g.target_amount) <= currentNetWorth * 3
          ).map((g) => (
            <ReferenceLine
              key={g.id}
              y={Number(g.target_amount)}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: g.name,
                position: 'insideTopLeft',
                fill: '#f59e0b',
                fontSize: 10,
              }}
            />
          ))}

          {/* Historical area */}
          <Area
            type="monotone"
            dataKey="netWorth"
            stroke={isCurrentlyNegative ? '#ef4444' : '#22c55e'}
            strokeWidth={2}
            fill={isCurrentlyNegative ? 'url(#netWorthGradientNegative)' : 'url(#netWorthGradient)'}
            connectNulls={false}
          />

          {/* Projection line */}
          {projectionData && projectionData.length > 0 && (
            <Line
              type="monotone"
              dataKey="projectedNetWorth"
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls={false}
            />
          )}
        </ComposedChart>
      </ChartWrapper>
    </div>
  )
}

function TimeRangeSelector({
  range,
  setRange,
}: {
  range: TimeRange
  setRange: (r: TimeRange) => void
}) {
  const ranges: TimeRange[] = ['1M', '3M', '6M', '1Y', 'ALL']

  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {ranges.map((r) => (
        <button
          key={r}
          onClick={() => setRange(r)}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
            range === r
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  )
}

function filterDataByRange(
  data: { snapshot_date: string; net_worth: number; total_assets: number; total_liabilities: number }[],
  range: TimeRange
) {
  if (range === 'ALL') return data

  const now = new Date()
  let cutoff: Date

  switch (range) {
    case '1M':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      break
    case '3M':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
      break
    case '6M':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      break
    case '1Y':
      cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      break
    default:
      return data
  }

  return data.filter((d) => new Date(d.snapshot_date) >= cutoff)
}

function formatDateLabel(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

/**
 * Calculate nice round numbers for Y-axis that always include 0
 */
function calculateNiceScale(min: number, max: number): { domainMin: number; domainMax: number; ticks: number[] } {
  // Always include 0 to show distance from zero
  const actualMin = Math.min(min, 0)
  const actualMax = Math.max(max, 0)

  // Find the magnitude of the range
  const range = actualMax - actualMin
  if (range === 0) {
    // If all values are the same, create a range around that value
    const padding = Math.abs(actualMax) * 0.2 || 1000
    return {
      domainMin: actualMin - padding,
      domainMax: actualMax + padding,
      ticks: [actualMin - padding, 0, actualMax + padding].filter((v, i, a) => a.indexOf(v) === i),
    }
  }

  // Calculate a nice step size (1, 2, 5, 10, 20, 50, 100, etc.)
  const roughStep = range / 4 // Aim for ~4-5 ticks
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
  const residual = roughStep / magnitude

  let niceStep: number
  if (residual <= 1.5) niceStep = magnitude
  else if (residual <= 3) niceStep = 2 * magnitude
  else if (residual <= 7) niceStep = 5 * magnitude
  else niceStep = 10 * magnitude

  // Round min down and max up to nice step boundaries
  const domainMin = Math.floor(actualMin / niceStep) * niceStep
  const domainMax = Math.ceil(actualMax / niceStep) * niceStep

  // Generate tick values
  const ticks: number[] = []
  for (let tick = domainMin; tick <= domainMax; tick += niceStep) {
    ticks.push(Math.round(tick * 100) / 100) // Avoid floating point issues
  }

  // Ensure 0 is included if it's in the range
  if (domainMin < 0 && domainMax > 0 && !ticks.includes(0)) {
    ticks.push(0)
    ticks.sort((a, b) => a - b)
  }

  return { domainMin, domainMax, ticks }
}
