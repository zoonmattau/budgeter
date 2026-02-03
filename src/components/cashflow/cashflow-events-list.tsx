'use client'

import { format, parseISO, isToday, isTomorrow, isThisWeek } from 'date-fns'
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { TimelineDay } from '@/lib/timeline-calculator'

interface CashflowEventsListProps {
  timeline: TimelineDay[]
  maxEvents?: number
}

function formatEventDate(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isThisWeek(date)) return format(date, 'EEEE')
  return format(date, 'MMM d')
}

export function CashflowEventsList({ timeline, maxEvents = 10 }: CashflowEventsListProps) {
  // Collect all events with their dates
  const allEvents: { date: string; type: 'income' | 'bill'; name: string; amount: number }[] = []

  for (const day of timeline) {
    for (const event of day.events) {
      allEvents.push({
        date: day.date,
        type: event.type,
        name: event.name,
        amount: event.amount,
      })
    }
  }

  // Limit to maxEvents
  const events = allEvents.slice(0, maxEvents)

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No upcoming events</p>
        <p className="text-xs mt-1">Add bills or set up your pay schedule</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {events.map((event, idx) => (
        <div
          key={`${event.date}-${event.name}-${idx}`}
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              event.type === 'income'
                ? 'bg-sprout-100 text-sprout-600'
                : 'bg-coral-100 text-coral-600'
            }`}
          >
            {event.type === 'income' ? (
              <ArrowUpCircle className="w-4 h-4" />
            ) : (
              <ArrowDownCircle className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">{event.name}</p>
            <p className="text-xs text-gray-500">{formatEventDate(event.date)}</p>
          </div>
          <p
            className={`font-semibold text-sm ${
              event.type === 'income' ? 'text-sprout-600' : 'text-gray-900'
            }`}
          >
            {event.type === 'income' ? '+' : '-'}
            {formatCurrency(event.amount)}
          </p>
        </div>
      ))}

      {allEvents.length > maxEvents && (
        <p className="text-center text-xs text-gray-400 pt-2">
          +{allEvents.length - maxEvents} more events
        </p>
      )}
    </div>
  )
}
