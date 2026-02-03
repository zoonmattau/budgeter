'use client'

import Link from 'next/link'
import { Receipt, Calendar, AlertCircle, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { differenceInDays, isPast, isToday } from 'date-fns'

interface Bill {
  id: string
  name: string
  amount: number
  next_due: string
  is_one_off?: boolean
  is_active: boolean
}

interface BillsSummaryProps {
  bills: Bill[]
}

export function BillsSummary({ bills }: BillsSummaryProps) {
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

  if (activeBills.length === 0) {
    return null
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-gray-900">Bills & Subscriptions</h2>
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

      <Link href="/bills" className="card block hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-bloom-100 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-bloom-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Recurring Bills ({recurringBills.length})</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalRecurringAmount)}/month</p>
          </div>
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
      </Link>
    </section>
  )
}
