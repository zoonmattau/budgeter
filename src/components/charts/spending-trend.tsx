'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { ChartWrapper } from './chart-wrapper'
import { formatCompactCurrency } from '@/lib/utils'

interface SpendingTrendProps {
  data: { date: string; amount: number; label: string }[]
  height?: number
  dailyBudget?: number
}

export function SpendingTrend({ data, height = 200, dailyBudget }: SpendingTrendProps) {
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

  const maxAmount = Math.max(...data.map((d) => d.amount), dailyBudget || 0)

  return (
    <ChartWrapper height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          tickFormatter={(value) => formatCompactCurrency(value)}
          domain={[0, maxAmount * 1.1]}
          width={45}
        />

        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Spent']}
          contentStyle={{
            borderRadius: '12px',
            border: 'none',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            padding: '8px 12px',
          }}
          labelStyle={{ fontWeight: 600 }}
        />

        {dailyBudget && dailyBudget > 0 && (
          <ReferenceLine
            y={dailyBudget}
            stroke="#22c55e"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: 'Daily target',
              position: 'right',
              fill: '#22c55e',
              fontSize: 10,
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
      </AreaChart>
    </ChartWrapper>
  )
}
