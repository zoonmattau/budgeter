'use client'

import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { CategoryChip } from '@/components/ui/category-chip'
import type { Tables } from '@/lib/database.types'

type TransactionWithCategory = Tables<'transactions'> & {
  categories: Tables<'categories'> | null
}

interface TransactionsListProps {
  transactions: TransactionWithCategory[]
}

export function TransactionsList({ transactions }: TransactionsListProps) {
  if (transactions.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-gray-600 font-medium mb-1">No transactions yet</p>
        <p className="text-gray-400 text-sm">Tap the + button to add your first expense</p>
      </div>
    )
  }

  // Group transactions by date
  const grouped = transactions.reduce((acc, transaction) => {
    const date = transaction.date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(transaction)
    return acc
  }, {} as Record<string, TransactionWithCategory[]>)

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, dayTransactions]) => {
        const parsedDate = parseISO(date)
        let dateLabel = format(parsedDate, 'EEEE, MMM d')
        if (isToday(parsedDate)) dateLabel = 'Today'
        else if (isYesterday(parsedDate)) dateLabel = 'Yesterday'

        const dayTotal = dayTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0)

        return (
          <div key={date}>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-medium text-gray-500">{dateLabel}</h3>
              <span className="text-sm text-gray-400">-{formatCurrency(dayTotal)}</span>
            </div>
            <div className="card divide-y divide-gray-50">
              {dayTransactions.map((transaction) => {
                const isIncome = transaction.type === 'income'
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {transaction.categories && (
                        <CategoryChip
                          name={transaction.categories.name}
                          color={transaction.categories.color}
                          icon={transaction.categories.icon}
                          size="md"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-400">
                          {transaction.categories?.name}
                        </p>
                      </div>
                    </div>
                    <p className={`font-semibold flex-shrink-0 ml-3 ${isIncome ? 'text-sprout-600' : 'text-gray-900'}`}>
                      {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
