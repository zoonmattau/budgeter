'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO, isToday } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { TimelineDay } from '@/lib/timeline-calculator'

interface CashflowTimelineChartProps {
  timeline: TimelineDay[]
  height?: number
}

function formatXAxisLabel(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Today'
  return format(date, 'MMM d')
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    payload: TimelineDay
  }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload
  const date = parseISO(data.date)

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 min-w-[160px]">
      <p className="font-medium text-sm text-gray-900 mb-1">
        {format(date, 'EEEE, MMM d')}
      </p>
      <p
        className={`text-lg font-bold ${
          data.isNegative ? 'text-red-600' : 'text-gray-900'
        }`}
      >
        {formatCurrency(data.projectedBalance)}
      </p>
      {data.events.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
          {data.events.map((event, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <span className="text-gray-600 truncate mr-2">{event.name}</span>
              <span
                className={
                  event.type === 'income' ? 'text-sprout-600' : 'text-coral-600'
                }
              >
                {event.type === 'income' ? '+' : '-'}
                {formatCurrency(event.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CashflowTimelineChart({
  timeline,
  height = 250,
}: CashflowTimelineChartProps) {
  if (timeline.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-xl"
        style={{ height }}
      >
        <p className="text-gray-400 text-sm">No timeline data</p>
      </div>
    )
  }

  // Calculate domain
  const balances = timeline.map((d) => d.projectedBalance)
  const minBalance = Math.min(...balances, 0)
  const maxBalance = Math.max(...balances)
  const padding = (maxBalance - minBalance) * 0.1 || 100

  // Sample data points for x-axis (show ~6-8 labels)
  const step = Math.max(1, Math.floor(timeline.length / 7))

  const chartData = timeline.map((day, index) => ({
    ...day,
    showLabel: index === 0 || index === timeline.length - 1 || index % step === 0,
  }))

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="balanceGradientPositive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="balanceGradientNegative" x1="0" y1="1" x2="0" y2="0">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={formatXAxisLabel}
            interval="preserveStartEnd"
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
            domain={[minBalance - padding, maxBalance + padding]}
            width={45}
          />

          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine
            y={0}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeWidth={1}
          />

          <Area
            type="monotone"
            dataKey="projectedBalance"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#balanceGradientPositive)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
