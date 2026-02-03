'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'
import { ChartWrapper } from './chart-wrapper'
import { formatCurrency } from '@/lib/utils'

interface CategoryBarChartProps {
  data: { name: string; spent: number; budgeted: number; color: string }[]
  height?: number
}

export function CategoryBarChart({ data, height = 300 }: CategoryBarChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-xl"
        style={{ height }}
      >
        <p className="text-gray-400 text-sm">No budget data</p>
      </div>
    )
  }

  // Convert to percentage of budget (100% = on budget)
  const chartData = data.map(d => ({
    ...d,
    percent: d.budgeted > 0 ? (d.spent / d.budgeted) * 100 : 0,
  }))

  return (
    <ChartWrapper height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 50, left: 10, bottom: 5 }}
      >
        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickFormatter={(value) => `${Math.round(value)}%`}
          domain={[0, (dataMax: number) => Math.max(100, dataMax * 1.1)]}
          ticks={[0, 25, 50, 75, 100]}
        />

        <YAxis
          type="category"
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#374151' }}
          width={80}
        />

        <Tooltip
          formatter={(value, name, props) => {
            const item = props.payload
            return [
              `${formatCurrency(item.spent)} of ${formatCurrency(item.budgeted)} (${Math.round(Number(value))}%)`,
              'Spent',
            ]
          }}
          contentStyle={{
            borderRadius: '12px',
            border: 'none',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            padding: '8px 12px',
          }}
        />

        <Bar dataKey="percent" radius={[0, 6, 6, 0]} barSize={24}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.percent > 100 ? '#ef4444' : entry.percent > 80 ? '#f59e0b' : entry.color}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartWrapper>
  )
}
