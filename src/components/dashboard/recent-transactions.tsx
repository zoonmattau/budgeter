'use client'

import { useState } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { Pencil } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CategoryChip } from '@/components/ui/category-chip'
import { MemberBadge, getMemberIndex } from '@/components/ui/member-badge'
import { TransactionEditModal } from '@/components/transactions/transaction-edit-modal'
import type { Tables } from '@/lib/database.types'
import type { HouseholdMember } from '@/lib/scope-context'

type TransactionWithCategory = Tables<'transactions'> & {
  categories: Tables<'categories'> | null
  profiles?: { display_name: string | null } | null
  accounts?: { name: string } | null
}

interface RecentTransactionsProps {
  transactions: TransactionWithCategory[]
  categories: Tables<'categories'>[]
  creditCards: Tables<'accounts'>[]
  bankAccounts?: Tables<'accounts'>[]
  showMemberBadge?: boolean
  members?: HouseholdMember[]
  currentUserId?: string
}

export function RecentTransactions({
  transactions,
  categories,
  creditCards,
  bankAccounts = [],
  showMemberBadge = false,
  members = [],
  currentUserId,
}: RecentTransactionsProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithCategory | null>(null)
  if (transactions.length === 0) {
    return (
      <div className="card text-center py-6">
        <p className="text-gray-500 text-sm">No transactions this month</p>
      </div>
    )
  }

  return (
    <div className="card divide-y divide-gray-50">
      {transactions.map((transaction) => {
        const date = new Date(transaction.date)
        let dateText = format(date, 'MMM d')
        if (isToday(date)) dateText = 'Today'
        else if (isYesterday(date)) dateText = 'Yesterday'

        const isIncome = transaction.type === 'income'
        const isOwnTransaction = transaction.user_id === currentUserId
        const memberIndex = getMemberIndex(transaction.user_id, members)
        const displayName = isOwnTransaction ? 'You' : transaction.profiles?.display_name || null

        return (
          <div
            key={transaction.id}
            className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              {showMemberBadge && (
                <MemberBadge
                  name={displayName}
                  index={memberIndex}
                  size="sm"
                />
              )}
              {transaction.categories && (
                <CategoryChip
                  name={transaction.categories.name}
                  color={transaction.categories.color}
                  icon={transaction.categories.icon}
                  size="sm"
                />
              )}
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{transaction.description}</p>
                <p className="text-xs text-gray-400">
                  {dateText} · {transaction.accounts?.name || 'Cash'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <p className={`font-semibold ${isIncome ? 'text-sprout-600' : 'text-gray-900'}`}>
                {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
              </p>
              <button
                onClick={() => setSelectedTransaction(transaction)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit transaction"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      })}

      {/* Edit Modal */}
      {selectedTransaction && categories.length > 0 && (
        <TransactionEditModal
          transaction={selectedTransaction}
          categories={categories}
          creditCards={creditCards}
          bankAccounts={bankAccounts}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  )
}
