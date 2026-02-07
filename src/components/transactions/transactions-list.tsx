'use client'

import { useState } from 'react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { CategoryChip } from '@/components/ui/category-chip'
import { MemberBadge, getMemberIndex } from '@/components/ui/member-badge'
import { MemberBreakdown, MemberSpending } from '@/components/ui/member-breakdown'
import { TransactionEditModal } from './transaction-edit-modal'
import type { Tables } from '@/lib/database.types'
import type { HouseholdMember } from '@/lib/scope-context'
import { ChevronDown, Pencil } from 'lucide-react'

type TransactionWithCategory = Tables<'transactions'> & {
  categories: Tables<'categories'> | null
  profiles?: { display_name: string | null } | null
}

interface TransactionsListProps {
  transactions: TransactionWithCategory[]
  categories?: Tables<'categories'>[]
  creditCards?: Tables<'accounts'>[]
  bankAccounts?: Tables<'accounts'>[]
  showMemberBadge?: boolean
  members?: HouseholdMember[]
  currentUserId?: string
  memberBreakdown?: MemberSpending[]
}

export function TransactionsList({
  transactions,
  categories = [],
  creditCards = [],
  bankAccounts = [],
  showMemberBadge = false,
  members = [],
  currentUserId,
  memberBreakdown = [],
}: TransactionsListProps) {
  const [memberFilter, setMemberFilter] = useState<string | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithCategory | null>(null)

  // Filter transactions by member if filter is active
  const filteredTransactions = memberFilter
    ? transactions.filter(t => t.user_id === memberFilter)
    : transactions

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
  const grouped = filteredTransactions.reduce((acc, transaction) => {
    const date = transaction.date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(transaction)
    return acc
  }, {} as Record<string, TransactionWithCategory[]>)

  return (
    <div className="space-y-4">
      {/* Member filter dropdown for household view */}
      {showMemberBadge && members.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filter by:</span>
          <div className="relative">
            <select
              value={memberFilter || ''}
              onChange={(e) => setMemberFilter(e.target.value || null)}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-bloom-500 focus:border-transparent"
            >
              <option value="">All members</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.user_id === currentUserId ? 'You' : member.display_name || 'Unknown'}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Member breakdown summary */}
      {showMemberBadge && memberBreakdown.length > 0 && !memberFilter && (
        <div className="card">
          <p className="text-sm text-gray-500 mb-2">Spending by member</p>
          <MemberBreakdown
            breakdown={memberBreakdown}
            showLegend={true}
            showAmounts={true}
          />
        </div>
      )}

      {Object.entries(grouped)
        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
        .map(([date, dayTransactions]) => {
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
                const isOwnTransaction = transaction.user_id === currentUserId
                const memberIndex = getMemberIndex(transaction.user_id, members)
                const displayName = isOwnTransaction ? 'You' : transaction.profiles?.display_name || null

                return (
                  <button
                    key={transaction.id}
                    onClick={() => setSelectedTransaction(transaction)}
                    className="group flex items-center justify-between py-3 first:pt-0 last:pb-0 w-full text-left hover:bg-gray-50 -mx-4 px-4 transition-colors cursor-pointer"
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
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <p className={`font-semibold ${isIncome ? 'text-sprout-600' : 'text-gray-900'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      <Pencil className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {filteredTransactions.length === 0 && transactions.length > 0 && (
        <div className="card text-center py-8">
          <p className="text-gray-500 text-sm">No transactions from this member</p>
        </div>
      )}

      {/* Edit Modal */}
      {selectedTransaction && categories.length > 0 && (
        <TransactionEditModal
          transaction={selectedTransaction}
          categories={categories.filter(c => c.type === selectedTransaction.type)}
          creditCards={creditCards}
          bankAccounts={bankAccounts}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  )
}
