'use client'

import { format, differenceInDays, isToday, isTomorrow } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { CategoryChip } from '@/components/ui/category-chip'
import type { Tables } from '@/lib/database.types'

type BillWithCategory = Tables<'bills'> & {
  categories: Tables<'categories'> | null
}

interface UpcomingBillsProps {
  bills: BillWithCategory[]
}

export function UpcomingBills({ bills }: UpcomingBillsProps) {
  if (bills.length === 0) {
    return (
      <div className="card text-center py-6">
        <p className="text-gray-500 text-sm">No upcoming bills</p>
      </div>
    )
  }

  return (
    <div className="card divide-y divide-gray-50">
      {bills.map((bill) => {
        const dueDate = new Date(bill.next_due)
        const daysUntil = differenceInDays(dueDate, new Date())
        const isUrgent = daysUntil <= 3

        let dueDateText = format(dueDate, 'MMM d')
        if (isToday(dueDate)) dueDateText = 'Today'
        else if (isTomorrow(dueDate)) dueDateText = 'Tomorrow'

        return (
          <div key={bill.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              {bill.categories && (
                <CategoryChip
                  name={bill.categories.name}
                  color={bill.categories.color}
                  icon={bill.categories.icon}
                  size="sm"
                />
              )}
              <div>
                <p className="font-medium text-gray-900">{bill.name}</p>
                <p className={`text-xs ${isUrgent ? 'text-coral-500 font-medium' : 'text-gray-400'}`}>
                  {dueDateText}
                </p>
              </div>
            </div>
            <p className="font-semibold text-gray-900">{formatCurrency(bill.amount)}</p>
          </div>
        )
      })}
    </div>
  )
}
