'use client'

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import { ChartWrapper } from './chart-wrapper'

interface SpendingTrendProps {
  data: { date: string; amount: number; label: string }[]
  height?: number
  dailyBudget?: number
  showRollingAverages?: boolean
}

function calculateRollingAverage(data: { amount: number }[], windowSize: number): number[] {
  return data.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1)
    const window = data.slice(start, index + 1)
    const sum = window.reduce((acc, d) => acc + d.amount, 0)
    return sum / window.length
  })
}

function calculateNiceTicks(maxValue: number): number[] {
  if (maxValue <= 0) return [0]

  const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)))
  const normalized = maxValue / magnitude

  let step: number
  if (normalized <= 2) step = magnitude * 0.5
  else if (normalized <= 5) step = magnitude
  else step = magnitude * 2

  const ticks: number[] = []
  for (let tick = 0; tick <= maxValue + step; tick += step) {
    ticks.push(Math.round(tick))
    if (ticks.length >= 5) break
  }
  return ticks
}

export function SpendingTrend({ data, height = 200, dailyBudget, showRollingAverages = true }: SpendingTrendProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-xl"
        style={{ height }}
      >
        <p className="text-gray-400 text-sm">No spending data</p>
      </div>
    )
  }

  // Calculate rolling averages
  const avg7 = calculateRollingAverage(data, 7)
  const avg14 = calculateRollingAverage(data, 14)
  const avg30 = calculateRollingAverage(data, 30)

  const chartData = data.map((d, i) => ({
    ...d,
    avg7: avg7[i],
    avg14: avg14[i],
    avg30: avg30[i],
  }))

  const allValues = [
    ...data.map(d => d.amount),
    ...avg7,
    ...avg14,
    ...avg30,
    dailyBudget || 0,
  ]
  const maxAmount = Math.max(...allValues)
  const ticks = calculateNiceTicks(maxAmount)
  const domainMax = ticks[ticks.length - 1] || maxAmount * 1.1

  return (
    <ChartWrapper height={height}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
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
          tickFormatter={(value) => `$${Math.round(value)}`}
          domain={[0, domainMax]}
          ticks={ticks}
          width={50}
        />

        <Tooltip
          formatter={(value, name) => {
            const labels: Record<string, string> = {
              amount: 'Daily',
              avg7: '7-day avg',
              avg14: '14-day avg',
              avg30: '30-day avg',
            }
            return [`$${Math.round(Number(value) ?? 0)}`, labels[String(name)] || name]
          }}
          contentStyle={{
            borderRadius: '12px',
            border: 'none',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            padding: '8px 12px',
          }}
          labelStyle={{ fontWeight: 600 }}
        />

        {showRollingAverages && (
          <Legend
            verticalAlign="top"
            height={30}
            formatter={(value) => {
              const labels: Record<string, string> = {
                amount: 'Daily',
                avg7: '7d',
                avg14: '14d',
                avg30: '30d',
              }
              return <span className="text-xs">{labels[value] || value}</span>
            }}
          />
        )}

        <Area
          type="monotone"
          dataKey="amount"
          stroke="#d946ef"
          strokeWidth={2}
          fill="url(#spendingGradient)"
        />

        {showRollingAverages && data.length >= 7 && (
          <Line
            type="monotone"
            dataKey="avg7"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="3 3"
          />
        )}

        {showRollingAverages && data.length >= 14 && (
          <Line
            type="monotone"
            dataKey="avg14"
            stroke="#22c55e"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="5 5"
          />
        )}

        {showRollingAverages && data.length >= 30 && (
          <Line
            type="monotone"
            dataKey="avg30"
            stroke="#f59e0b"
            strokeWidth={1.5}
            dot={false}
          />
        )}
      </ComposedChart>
    </ChartWrapper>
  )
}
