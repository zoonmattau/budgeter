'use client'

import { format, differenceInDays, isToday, isTomorrow } from 'date-fns'
import { CreditCard } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CategoryChip } from '@/components/ui/category-chip'
import { AccountLogo } from '@/components/ui/account-logo'
import type { Tables } from '@/lib/database.types'

type BillWithCategory = Tables<'bills'> & {
  categories: Tables<'categories'> | null
}

interface DebtAccount {
  id: string
  name: string
  type: string
  balance: number
  due_date: number | null
  minimum_payment: number | null
  institution?: string | null
}

interface UpcomingBillsProps {
  bills: BillWithCategory[]
  debtAccounts?: DebtAccount[]
}

export function UpcomingBills({ bills, debtAccounts = [] }: UpcomingBillsProps) {
  // Calculate due date for debt accounts based on due_date (day of month)
  const today = new Date()
  const currentDay = today.getDate()

  const debtPayments = debtAccounts
    .filter(a => a.due_date && a.minimum_payment && a.minimum_payment > 0)
    .map(account => {
      const dueDay = account.due_date!
      let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay)

      // If due date has passed this month, it's next month
      if (dueDay < currentDay) {
        dueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay)
      }

      return {
        id: `debt-${account.id}`,
        name: account.name,
        amount: account.minimum_payment!,
        dueDate,
        isDebt: true,
        institution: account.institution,
        type: account.type,
      }
    })

  const billItems = bills.map(bill => ({
    id: bill.id,
    name: bill.name,
    amount: bill.amount,
    dueDate: new Date(bill.next_due),
    isDebt: false,
    category: bill.categories,
  }))

  // Combine and sort by due date
  const allPayments = [...billItems, ...debtPayments].sort(
    (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
  )

  if (allPayments.length === 0) {
    return (
      <div className="card text-center py-6">
        <p className="text-gray-500 text-sm">No upcoming payments</p>
      </div>
    )
  }

  return (
    <div className="card divide-y divide-gray-50">
      {allPayments.map((payment) => {
        const daysUntil = differenceInDays(payment.dueDate, today)
        const isUrgent = daysUntil <= 3 && daysUntil >= 0

        let dueDateText = format(payment.dueDate, 'MMM d')
        if (isToday(payment.dueDate)) dueDateText = 'Today'
        else if (isTomorrow(payment.dueDate)) dueDateText = 'Tomorrow'

        return (
          <div key={payment.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              {payment.isDebt ? (
                <AccountLogo
                  institution={(payment as typeof debtPayments[0]).institution}
                  type={(payment as typeof debtPayments[0]).type as 'credit' | 'credit_card' | 'loan'}
                  size="sm"
                />
              ) : (payment as typeof billItems[0]).category ? (
                <CategoryChip
                  name={(payment as typeof billItems[0]).category!.name}
                  color={(payment as typeof billItems[0]).category!.color}
                  icon={(payment as typeof billItems[0]).category!.icon}
                  size="sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">{payment.name}</p>
                <p className={`text-xs ${isUrgent ? 'text-coral-500 font-medium' : 'text-gray-400'}`}>
                  {dueDateText}
                  {payment.isDebt && <span className="ml-1 text-gray-300">• Min payment</span>}
                </p>
              </div>
            </div>
            <p className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</p>
          </div>
        )
      })}
    </div>
  )
}
