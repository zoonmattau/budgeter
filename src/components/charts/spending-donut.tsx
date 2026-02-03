'use client'

import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { ChartWrapper } from './chart-wrapper'
import { formatCurrency } from '@/lib/utils'

interface SpendingDonutProps {
  data: { name: string; value: number; color: string; count?: number; percent?: number }[]
  height?: number
  showLegend?: boolean
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { payload: { name: string; value: number; count?: number; percent?: number } }[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload[0]) return null

  const data = payload[0].payload
  return (
    <div className="bg-white rounded-xl shadow-lg p-3 border border-gray-100">
      <p className="font-medium text-gray-900">{data.name}</p>
      <p className="text-lg font-bold text-gray-900">{formatCurrency(data.value)}</p>
      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
        {data.percent !== undefined && (
          <span>{data.percent.toFixed(1)}% of total</span>
        )}
        {data.count !== undefined && (
          <span>{data.count} transaction{data.count !== 1 ? 's' : ''}</span>
        )}
      </div>
    </div>
  )
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
            innerRadius={height < 150 ? '40%' : '50%'}
            outerRadius={height < 150 ? '90%' : '80%'}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
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
              <span className="text-xs text-gray-600">
                {item.name}
                {item.percent !== undefined && ` (${item.percent.toFixed(0)}%)`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
