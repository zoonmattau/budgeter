'use client'

import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { Calendar, RotateCcw, ChevronRight, CalendarCheck, AlertCircle, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CategoryChip } from '@/components/ui/category-chip'
import type { Tables } from '@/lib/database.types'

type BillWithCategory = Tables<'bills'> & {
  categories: Tables<'categories'> | null
}

interface BillsTimelineProps {
  overdue: BillWithCategory[]
  thisWeek: BillWithCategory[]
  nextWeek: BillWithCategory[]
  thisMonth: BillWithCategory[]
  later: BillWithCategory[]
  overdueTotal: number
  thisWeekTotal: number
  nextWeekTotal: number
  thisMonthTotal: number
}

const frequencyLabels: Record<string, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

function BillCard({ bill }: { bill: BillWithCategory }) {
  const dueDate = new Date(bill.next_due)
  const daysUntil = differenceInDays(dueDate, new Date())
  const isOverdue = daysUntil < 0

  return (
    <Link
      href={`/bills/${bill.id}`}
      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
    >
      {bill.categories && (
        <CategoryChip
          name={bill.categories.name}
          color={bill.categories.color}
          icon={bill.categories.icon}
          size="sm"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">{bill.name}</p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{format(dueDate, 'EEE, MMM d')}</span>
          {bill.is_one_off ? (
            <span className="flex items-center gap-0.5">
              <CalendarCheck className="w-3 h-3" />
              One-off
            </span>
          ) : (
            <span className="flex items-center gap-0.5">
              <RotateCcw className="w-3 h-3" />
              {frequencyLabels[bill.frequency]}
            </span>
          )}
        </div>
      </div>
      <p className={`font-semibold text-sm ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
        {formatCurrency(bill.amount)}
      </p>
      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
    </Link>
  )
}

function TimelineSection({
  title,
  bills,
  total,
  icon,
  color,
  emptyMessage,
}: {
  title: string
  bills: BillWithCategory[]
  total: number
  icon: React.ReactNode
  color: 'red' | 'amber' | 'blue' | 'gray' | 'green'
  emptyMessage?: string
}) {
  const colorClasses = {
    red: 'bg-red-100 text-red-600 border-red-200',
    amber: 'bg-amber-100 text-amber-600 border-amber-200',
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    green: 'bg-sprout-100 text-sprout-600 border-sprout-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  const dotColors = {
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    green: 'bg-sprout-500',
    gray: 'bg-gray-400',
  }

  if (bills.length === 0 && !emptyMessage) return null

  return (
    <div className="relative">
      {/* Timeline dot and line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
      <div className={`absolute left-2.5 top-4 w-3 h-3 rounded-full ${dotColors[color]} ring-4 ring-white`} />

      <div className="pl-10 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
              {icon}
            </span>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {bills.length > 0 && (
              <span className="text-xs text-gray-400">({bills.length})</span>
            )}
          </div>
          {total > 0 && (
            <span className={`text-sm font-semibold ${color === 'red' ? 'text-red-600' : 'text-gray-900'}`}>
              {formatCurrency(total)}
            </span>
          )}
        </div>

        {/* Bills */}
        {bills.length > 0 ? (
          <div className="space-y-2">
            {bills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </div>
        ) : emptyMessage ? (
          <p className="text-sm text-gray-400 italic">{emptyMessage}</p>
        ) : null}
      </div>
    </div>
  )
}

export function BillsTimeline({
  overdue,
  thisWeek,
  nextWeek,
  thisMonth,
  later,
  overdueTotal,
  thisWeekTotal,
  nextWeekTotal,
  thisMonthTotal,
}: BillsTimelineProps) {
  const hasAnyBills = overdue.length + thisWeek.length + nextWeek.length + thisMonth.length + later.length > 0

  if (!hasAnyBills) {
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
    <div className="relative">
      {overdue.length > 0 && (
        <TimelineSection
          title="Overdue"
          bills={overdue}
          total={overdueTotal}
          icon={<AlertCircle className="w-4 h-4" />}
          color="red"
        />
      )}

      <TimelineSection
        title="This Week"
        bills={thisWeek}
        total={thisWeekTotal}
        icon={<Clock className="w-4 h-4" />}
        color={thisWeek.length > 0 ? 'amber' : 'green'}
        emptyMessage={overdue.length === 0 ? "Nothing due this week" : undefined}
      />

      <TimelineSection
        title="Next Week"
        bills={nextWeek}
        total={nextWeekTotal}
        icon={<Calendar className="w-4 h-4" />}
        color="blue"
      />

      <TimelineSection
        title="Later This Month"
        bills={thisMonth}
        total={thisMonthTotal}
        icon={<Calendar className="w-4 h-4" />}
        color="gray"
      />

      {later.length > 0 && (
        <TimelineSection
          title="Upcoming"
          bills={later}
          total={0}
          icon={<Calendar className="w-4 h-4" />}
          color="gray"
        />
      )}

      {/* End of timeline */}
      <div className="absolute left-2.5 bottom-0 w-3 h-3 rounded-full bg-gray-300 ring-4 ring-white" />
    </div>
  )
}
