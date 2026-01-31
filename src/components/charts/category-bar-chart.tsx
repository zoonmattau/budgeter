'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts'
import { ChartWrapper } from './chart-wrapper'
import { formatCurrency, formatCompactCurrency } from '@/lib/utils'

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

  const maxValue = Math.max(
    ...data.flatMap((d) => [d.spent, d.budgeted])
  )

  return (
    <ChartWrapper height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickFormatter={(value) => formatCompactCurrency(value)}
          domain={[0, maxValue * 1.1]}
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
          formatter={(value, name) => [
            formatCurrency(Number(value)),
            name === 'spent' ? 'Spent' : 'Budget',
          ]}
          contentStyle={{
            borderRadius: '12px',
            border: 'none',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            padding: '8px 12px',
          }}
        />

        {/* Budget reference lines for each category */}
        {data.map((item, index) => (
          <ReferenceLine
            key={`ref-${index}`}
            x={item.budgeted}
            stroke="#22c55e"
            strokeDasharray="3 3"
            strokeWidth={1.5}
            segment={[
              { y: index - 0.35 },
              { y: index + 0.35 },
            ]}
          />
        ))}

        <Bar dataKey="spent" radius={[0, 6, 6, 0]} barSize={24}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.spent > entry.budgeted ? '#ef4444' : entry.color}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartWrapper>
  )
}
