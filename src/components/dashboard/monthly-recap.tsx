import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

interface MonthlyRecapProps {
  totalIncome: number
  totalSpent: number
  totalAllocated: number
  topCategory: { name: string; amount: number } | null
  netWorthChange: number
  month: string // 'MMMM yyyy'
  daysIntoMonth: number
  daysInMonth: number
}

export function MonthlyRecap({
  totalIncome,
  totalSpent,
  totalAllocated,
  topCategory,
  netWorthChange,
  month,
  daysIntoMonth,
  daysInMonth,
}: MonthlyRecapProps) {
  const saved = totalIncome - totalSpent
  const savingsRate = totalIncome > 0 ? Math.round((saved / totalIncome) * 100) : 0
  const budgetUsed = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0
  const isEndOfMonth = daysIntoMonth >= daysInMonth - 2

  // Only show as "Monthly Recap" in last 3 days, otherwise "Month So Far"
  const title = isEndOfMonth ? `${month} Recap` : 'Month So Far'

  return (
    <div className="card bg-gradient-to-br from-gray-50 to-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-400">{daysIntoMonth}/{daysInMonth} days</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500">Income</p>
          <p className="text-lg font-bold text-sprout-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Spent</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Saved</p>
          <p className={`text-lg font-bold ${saved >= 0 ? 'text-sprout-600' : 'text-coral-500'}`}>
            {saved >= 0 ? '+' : ''}{formatCurrency(saved)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Savings rate</p>
          <p className={`text-lg font-bold ${savingsRate >= 20 ? 'text-sprout-600' : savingsRate >= 0 ? 'text-amber-500' : 'text-coral-500'}`}>
            {savingsRate}%
          </p>
        </div>
      </div>

      {(topCategory || budgetUsed > 0) && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          {topCategory && (
            <span>Top spend: <span className="font-medium text-gray-700">{topCategory.name}</span> ({formatCurrency(topCategory.amount)})</span>
          )}
          {budgetUsed > 0 && (
            <span className={`font-medium ${budgetUsed > 100 ? 'text-coral-500' : budgetUsed > 80 ? 'text-amber-500' : 'text-sprout-600'}`}>
              {budgetUsed}% of budget
            </span>
          )}
        </div>
      )}
    </div>
  )
}
