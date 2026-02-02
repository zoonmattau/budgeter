'use client'

import Link from 'next/link'
import { Receipt, Tv, Calendar, CheckCircle2, AlertCircle, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { differenceInDays, isPast, isToday } from 'date-fns'

interface Bill {
  id: string
  name: string
  amount: number
  next_due: string
  is_one_off?: boolean
  bill_type?: 'bill' | 'subscription'
  is_active: boolean
}

interface BillsSummaryProps {
  bills: Bill[]
}

export function BillsSummary({ bills }: BillsSummaryProps) {
  // Separate bills and subscriptions
  const activeBills = bills.filter(b => b.is_active)
  const regularBills = activeBills.filter(b => b.bill_type !== 'subscription')
  const subscriptions = activeBills.filter(b => b.bill_type === 'subscription')

  // Calculate totals
  const totalBillsAmount = regularBills.reduce((sum, b) => sum + Number(b.amount), 0)
  const totalSubscriptionsAmount = subscriptions.reduce((sum, b) => sum + Number(b.amount), 0)
  const totalAmount = totalBillsAmount + totalSubscriptionsAmount

  // Find upcoming/overdue
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
            className="w-7 h-7 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4 text-amber-600" />
          </Link>
          <Link href="/bills" className="text-sm text-bloom-600 hover:text-bloom-700 font-medium">
            See all
          </Link>
        </div>
      </div>

      <div className="card">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Bills ({regularBills.length})</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalBillsAmount)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Tv className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Subscriptions ({subscriptions.length})</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalSubscriptionsAmount)}</p>
            </div>
          </div>
        </div>

        {/* Total bar */}
        <div className="p-3 bg-gradient-to-r from-amber-50 to-purple-50 rounded-xl mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Monthly Total</span>
            <span className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex gap-3">
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
          {overdueBills.length === 0 && upcomingBills.length === 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sprout-50 rounded-full">
              <CheckCircle2 className="w-4 h-4 text-sprout-500" />
              <span className="text-sm font-medium text-sprout-700">
                All paid up
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
