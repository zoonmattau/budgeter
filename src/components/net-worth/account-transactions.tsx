import Link from 'next/link'
import { format } from 'date-fns'
import { Receipt, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CategoryChip } from '@/components/ui/category-chip'
import type { Tables } from '@/lib/database.types'

type TransactionWithCategory = Tables<'transactions'> & {
  categories: Tables<'categories'> | null
}

interface AccountTransactionsProps {
  transactions: TransactionWithCategory[]
  accountId: string
  accountName: string
}

export function AccountTransactions({ transactions, accountId, accountName: _accountName }: AccountTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        <p className="text-sm text-gray-500 text-center py-6">
          No transactions linked to this account yet
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-bloom-500" />
          <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        <Link
          href={`/transactions?account=${accountId}`}
          className="text-sm text-bloom-600 hover:text-bloom-700 flex items-center gap-1"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="divide-y divide-gray-50">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              {transaction.categories ? (
                <CategoryChip
                  name={transaction.categories.name}
                  color={transaction.categories.color}
                  icon={transaction.categories.icon}
                  size="sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  {transaction.type === 'income' ? (
                    <ArrowDownRight className="w-4 h-4 text-sprout-500" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {transaction.description || transaction.categories?.name || 'Transaction'}
                </p>
                <p className="text-xs text-gray-400">
                  {format(new Date(transaction.date), 'MMM d, yyyy')}
                </p>
              </div>
              <p className={`text-sm font-semibold ${
                transaction.type === 'income' ? 'text-sprout-600' : 'text-gray-900'
              }`}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
