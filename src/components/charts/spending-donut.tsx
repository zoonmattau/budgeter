'use client'

import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { ChartWrapper } from './chart-wrapper'
import { formatCurrency } from '@/lib/utils'

interface SpendingDonutProps {
  data: { name: string; value: number; color: string }[]
  height?: number
  showLegend?: boolean
}

export function SpendingDonut({ data, height = 200, showLegend = true }: SpendingDonutProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (data.length === 0 || total === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-xl"
        style={{ height }}
      >
        <p className="text-gray-400 text-sm">No spending data</p>
      </div>
    )
  }

  return (
    <div>
      <ChartWrapper height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              padding: '8px 12px',
            }}
          />
        </PieChart>
      </ChartWrapper>

      {showLegend && (
        <div className="flex flex-wrap justify-center gap-3 mt-3">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-gray-600">{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
