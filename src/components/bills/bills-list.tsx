'use client'

import Link from 'next/link'
import { format, differenceInDays, isToday, isTomorrow, isPast } from 'date-fns'
import { Calendar, RotateCcw, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CategoryChip } from '@/components/ui/category-chip'
import type { Tables } from '@/lib/database.types'

type BillWithCategory = Tables<'bills'> & {
  categories: Tables<'categories'> | null
}

interface BillsListProps {
  bills: BillWithCategory[]
}

const frequencyLabels: Record<string, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

export function BillsList({ bills }: BillsListProps) {
  if (bills.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="font-display text-lg font-semibold text-gray-900 mb-1">No bills yet</h3>
        <p className="text-gray-500 text-sm">Add your recurring bills to stay on top of payments</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {bills.map((bill) => {
        const dueDate = new Date(bill.next_due)
        const daysUntil = differenceInDays(dueDate, new Date())
        const isOverdue = isPast(dueDate) && !isToday(dueDate)
        const isUrgent = daysUntil <= 3 && daysUntil >= 0

        let dueDateText = format(dueDate, 'MMM d')
        if (isToday(dueDate)) dueDateText = 'Due today'
        else if (isTomorrow(dueDate)) dueDateText = 'Due tomorrow'
        else if (isOverdue) dueDateText = `Overdue (${format(dueDate, 'MMM d')})`
        else if (daysUntil <= 7) dueDateText = `In ${daysUntil} days`

        return (
          <Link key={bill.id} href={`/bills/${bill.id}`} className="card block hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              {bill.categories && (
                <CategoryChip
                  name={bill.categories.name}
                  color={bill.categories.color}
                  icon={bill.categories.icon}
                  size="md"
                />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 truncate">{bill.name}</h3>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <RotateCcw className="w-3 h-3" />
                    {frequencyLabels[bill.frequency]}
                  </span>
                </div>
                <p className={`text-sm ${isOverdue ? 'text-red-500 font-medium' : isUrgent ? 'text-coral-500' : 'text-gray-400'}`}>
                  {dueDateText}
                </p>
              </div>

              <p className="font-semibold text-gray-900">{formatCurrency(bill.amount)}</p>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
