'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Receipt, Calendar, AlertCircle, Plus, ChevronDown, ChevronUp, CreditCard, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { differenceInDays, isPast, isToday, isTomorrow, format } from 'date-fns'
import { CategoryChip } from '@/components/ui/category-chip'
import { AccountLogo } from '@/components/ui/account-logo'

interface Bill {
  id: string
  name: string
  amount: number
  next_due: string
  is_one_off?: boolean
  is_active: boolean
  categories?: {
    id: string
    name: string
    icon: string | null
    color: string
  } | null
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

interface RecentTransaction {
  id: string
  description: string
  amount: number
  date: string
  type: 'expense' | 'income' | 'investment'
  categories?: {
    id: string
    name: string
    icon: string | null
    color: string
  } | null
}

interface BillsSummaryProps {
  bills: Bill[]
  debtAccounts?: DebtAccount[]
  recentTransactions?: RecentTransaction[]
}

export function BillsSummary({ bills, debtAccounts = [], recentTransactions = [] }: BillsSummaryProps) {
  const [expanded, setExpanded] = useState(false)

  const activeBills = bills.filter(b => b.is_active)
  const recurringBills = activeBills.filter(b => !b.is_one_off)
  const totalRecurringAmount = recurringBills.reduce((sum, b) => sum + Number(b.amount), 0)

  // Find upcoming/overdue (all active bills, not just recurring)
  const today = new Date()
  const upcomingBills = activeBills.filter(b => {
    const dueDate = new Date(b.next_due)
    const daysUntil = differenceInDays(dueDate, today)
    return daysUntil >= 0 && daysUntil <= 7
  })

  const overdueBills = activeBills.filter(b => {
    const dueDate = new Date(b.next_due)
    return isPast(dueDate) && !isToday(dueDate)
  })

  // Find next upcoming bill for status display
  const futureBills = activeBills
    .filter(b => {
      const dueDate = new Date(b.next_due)
      return differenceInDays(dueDate, today) > 7
    })
    .sort((a, b) => new Date(a.next_due).getTime() - new Date(b.next_due).getTime())

  const nextBill = futureBills[0]
  const daysUntilNext = nextBill ? differenceInDays(new Date(nextBill.next_due), today) : null

  // Build combined payment list for expanded view
  const currentDay = today.getDate()
  const debtPayments = debtAccounts
    .filter(a => a.due_date && a.minimum_payment && a.minimum_payment > 0)
    .map(account => {
      const dueDay = account.due_date!
      let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay)
      if (dueDay < currentDay) {
        dueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay)
      }
      return {
        id: `debt-${account.id}`,
        name: account.name,
        amount: account.minimum_payment!,
        dueDate,
        isDebt: true as const,
        institution: account.institution,
        type: account.type,
      }
    })

  const billItems = activeBills.map(bill => ({
    id: bill.id,
    name: bill.name,
    amount: bill.amount,
    dueDate: new Date(bill.next_due),
    isDebt: false as const,
    category: bill.categories,
  }))

  // Aggregate past-day expenses into daily totals
  const dailyExpenseTotals = new Map<string, number>()
  recentTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const current = dailyExpenseTotals.get(t.date) || 0
      dailyExpenseTotals.set(t.date, current + t.amount)
    })

  const dailySpendItems = Array.from(dailyExpenseTotals.entries()).map(([date, total]) => ({
    id: `daily-${date}`,
    name: `Daily spending`,
    amount: total,
    dueDate: new Date(date + 'T00:00:00'),
    isDebt: false as const,
    isTransaction: true as const,
    txnType: 'expense' as string | undefined,
    category: undefined as Bill['categories'],
  }))

  const allPayments = [
    ...billItems.map(b => ({ ...b, isTransaction: false as const, txnType: undefined as string | undefined })),
    ...debtPayments.map(d => ({ ...d, isTransaction: false as const, txnType: undefined as string | undefined })),
    ...dailySpendItems,
  ].sort(
    (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
  )

  if (activeBills.length === 0 && recentTransactions.length === 0) {
    return null
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-gray-900">Upcoming & Recent</h2>
        <div className="flex items-center gap-3">
          <Link
            href="/bills/new"
            className="w-7 h-7 rounded-full bg-bloom-100 hover:bg-bloom-200 flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4 text-bloom-600" />
          </Link>
          <Link href="/bills" className="text-sm text-bloom-600 hover:text-bloom-700 font-medium">
            See all
          </Link>
        </div>
      </div>

      <div className="card">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-bloom-100 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-bloom-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Recurring Bills ({recurringBills.length})</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalRecurringAmount)}/month</p>
            </div>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {overdueBills.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-full">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">
                  {overdueBills.length} overdue
                </span>
              </div>
            )}
            {upcomingBills.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-700">
                  {upcomingBills.length} due this week
                </span>
              </div>
            )}
            {overdueBills.length === 0 && upcomingBills.length === 0 && nextBill && daysUntilNext && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">
                  Next bill in {daysUntilNext} days
                </span>
              </div>
            )}
          </div>
        </button>

        {/* Expanded: upcoming payments list */}
        {expanded && allPayments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 divide-y divide-gray-50">
            {allPayments.map((payment) => {
              const daysUntil = differenceInDays(payment.dueDate, today)
              const isUrgent = daysUntil <= 3 && daysUntil >= 0
              const isOverdue = daysUntil < 0

              let dueDateText = format(payment.dueDate, 'MMM d')
              if (isToday(payment.dueDate)) dueDateText = 'Today'
              else if (isTomorrow(payment.dueDate)) dueDateText = 'Tomorrow'
              else if (payment.isTransaction) dueDateText = format(payment.dueDate, 'MMM d')
              else if (isOverdue) dueDateText = `${Math.abs(daysUntil)}d overdue`

              return (
                <div key={payment.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    {payment.isTransaction ? (
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-gray-400" />
                      </div>
                    ) : payment.isDebt ? (
                      <AccountLogo
                        institution={payment.institution}
                        type={payment.type as 'credit' | 'credit_card' | 'loan'}
                        size="sm"
                      />
                    ) : payment.category ? (
                      <CategoryChip
                        name={payment.category.name}
                        color={payment.category.color}
                        icon={payment.category.icon ?? undefined}
                        size="sm"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{payment.name}</p>
                      <p className={`text-xs ${payment.isTransaction ? 'text-gray-400' : isOverdue ? 'text-red-500 font-medium' : isUrgent ? 'text-coral-500 font-medium' : 'text-gray-400'}`}>
                        {dueDateText}
                        {payment.isDebt && <span className="ml-1 text-gray-300">· Min payment</span>}
                      </p>
                    </div>
                  </div>
                  <p className={`font-semibold ${payment.isTransaction ? 'text-coral-500' : 'text-gray-900'}`}>
                    {payment.isTransaction ? '-' : ''}{formatCurrency(payment.amount)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
