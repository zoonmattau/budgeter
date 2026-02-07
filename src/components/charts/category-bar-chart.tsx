'use client'

import { formatCurrency } from '@/lib/utils'

interface CategoryBarChartProps {
  data: { name: string; categoryId?: string; spent: number; budgeted: number; color: string }[]
  height?: number
  onCategoryClick?: (categoryName: string) => void
  selectedCategory?: string | null
}

export function CategoryBarChart({ data, onCategoryClick, selectedCategory }: CategoryBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-gray-50 rounded-xl py-8">
        <p className="text-gray-400 text-sm">No budget data</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const percent = item.budgeted > 0 ? (item.spent / item.budgeted) * 100 : 0
        const isOver = percent > 100
        const isWarning = percent > 80 && !isOver
        const barColor = isOver ? '#ef4444' : isWarning ? '#f59e0b' : item.color
        const isSelected = selectedCategory === item.name

        return (
          <button
            key={item.name}
            onClick={() => onCategoryClick?.(item.name)}
            className={`w-full text-left p-3 rounded-xl transition-colors ${
              isSelected ? 'bg-gray-100 ring-1 ring-gray-300' : 'hover:bg-gray-50'
            }`}
          >
            {/* Category name and amounts */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-sm font-medium text-gray-900 truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className={`text-sm font-semibold ${isOver ? 'text-red-500' : 'text-gray-900'}`}>
                  {formatCurrency(item.spent)}
                </span>
                <span className="text-xs text-gray-400">/ {formatCurrency(item.budgeted)}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(percent, 100)}%`,
                  backgroundColor: barColor,
                }}
              />
            </div>

            {/* Percentage label */}
            <div className="flex justify-between mt-1">
              <span className={`text-xs ${isOver ? 'text-red-500 font-medium' : isWarning ? 'text-amber-500' : 'text-gray-400'}`}>
                {item.spent === 0 && item.budgeted > 0
                  ? 'No spending yet'
                  : `${Math.round(percent)}% used`}
              </span>
              {isOver && (
                <span className="text-xs text-red-500 font-medium">
                  {formatCurrency(item.spent - item.budgeted)} over
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
