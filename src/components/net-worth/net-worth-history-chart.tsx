'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
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
  height?: number
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL'

export function NetWorthHistoryChart({ data, height = 250 }: NetWorthHistoryChartProps) {
  const [range, setRange] = useState<TimeRange>('3M')

  const filteredData = filterDataByRange(data, range)

  const chartData = filteredData.map((d) => ({
    date: d.snapshot_date,
    netWorth: Number(d.net_worth),
    label: formatDateLabel(d.snapshot_date),
  }))

  if (chartData.length === 0) {
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

  const minValue = Math.min(...chartData.map((d) => d.netWorth))
  const maxValue = Math.max(...chartData.map((d) => d.netWorth))
  const hasNegative = minValue < 0

  return (
    <div className="space-y-4">
      <TimeRangeSelector range={range} setRange={setRange} />
      <ChartWrapper height={height}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="netWorthGradientNegative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3} />
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
            domain={[
              hasNegative ? minValue * 1.1 : 0,
              maxValue * 1.1
            ]}
            width={55}
          />

          <Tooltip
            formatter={(value) => [`$${Number(value).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Net Worth']}
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              padding: '8px 12px',
            }}
            labelStyle={{ fontWeight: 600 }}
          />

          {hasNegative && (
            <ReferenceLine
              y={0}
              stroke="#9ca3af"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}

          <Area
            type="monotone"
            dataKey="netWorth"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#netWorthGradient)"
          />
        </AreaChart>
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
