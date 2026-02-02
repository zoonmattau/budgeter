'use client'

import { format, isToday, isYesterday, startOfDay, isSameDay } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { MemberBadge, getMemberIndex } from '@/components/ui/member-badge'
import type { Tables } from '@/lib/database.types'
import type { HouseholdMember } from '@/lib/scope-context'
import Link from 'next/link'

type TransactionWithProfile = Tables<'transactions'> & {
  categories: Tables<'categories'> | null
  profiles: { display_name: string | null } | null
}

interface ActivityFeedProps {
  transactions: TransactionWithProfile[]
  members: HouseholdMember[]
  currentUserId: string
}

interface ActivityGroup {
  date: Date
  label: string
  items: TransactionWithProfile[]
}

export function ActivityFeed({ transactions, members, currentUserId }: ActivityFeedProps) {
  if (transactions.length === 0) {
    return (
      <div className="card text-center py-6">
        <p className="text-gray-500 text-sm">No household activity yet</p>
      </div>
    )
  }

  // Group transactions by date
  const grouped = transactions.reduce<ActivityGroup[]>((groups, transaction) => {
    const date = startOfDay(new Date(transaction.date))
    const existingGroup = groups.find((g) => isSameDay(g.date, date))

    if (existingGroup) {
      existingGroup.items.push(transaction)
    } else {
      let label = format(date, 'EEEE, MMM d')
      if (isToday(date)) label = 'Today'
      else if (isYesterday(date)) label = 'Yesterday'

      groups.push({
        date,
        label,
        items: [transaction],
      })
    }

    return groups
  }, [])

  // Sort groups by date descending
  grouped.sort((a, b) => b.date.getTime() - a.date.getTime())

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <div key={group.date.toISOString()}>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {group.label}
          </p>
          <div className="card divide-y divide-gray-50">
            {group.items.map((transaction) => {
              const isOwnTransaction = transaction.user_id === currentUserId
              const memberName = isOwnTransaction
                ? 'You'
                : transaction.profiles?.display_name || 'Someone'
              const memberIndex = getMemberIndex(transaction.user_id, members)
              const isIncome = transaction.type === 'income'
              const action = isIncome ? 'received' : 'added'

              return (
                <Link
                  key={transaction.id}
                  href={`/transactions?highlight=${transaction.id}`}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 hover:bg-gray-50 -mx-4 px-4 transition-colors"
                >
                  <MemberBadge
                    name={isOwnTransaction ? 'You' : transaction.profiles?.display_name || null}
                    index={memberIndex}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{memberName}</span>
                      {' '}{action}{' '}
                      <span className={isIncome ? 'text-sprout-600 font-semibold' : 'font-semibold'}>
                        {isIncome ? '+' : ''}{formatCurrency(transaction.amount)}
                      </span>
                      {' '}{transaction.description}
                    </p>
                    {transaction.categories && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {transaction.categories.name}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
