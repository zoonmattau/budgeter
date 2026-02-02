'use client'

import { format, isToday, isYesterday } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { CategoryChip } from '@/components/ui/category-chip'
import { MemberBadge, getMemberIndex } from '@/components/ui/member-badge'
import type { Tables } from '@/lib/database.types'
import type { HouseholdMember } from '@/lib/scope-context'

type TransactionWithCategory = Tables<'transactions'> & {
  categories: Tables<'categories'> | null
  profiles?: { display_name: string | null } | null
}

interface RecentTransactionsProps {
  transactions: TransactionWithCategory[]
  showMemberBadge?: boolean
  members?: HouseholdMember[]
  currentUserId?: string
}

export function RecentTransactions({
  transactions,
  showMemberBadge = false,
  members = [],
  currentUserId,
}: RecentTransactionsProps) {
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
                <p className="text-xs text-gray-400">{dateText}</p>
              </div>
            </div>
            <p className={`font-semibold flex-shrink-0 ml-2 ${isIncome ? 'text-sprout-600' : 'text-gray-900'}`}>
              {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
