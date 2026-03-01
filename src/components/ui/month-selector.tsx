'use client'

import { useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, parse, subMonths, addMonths, startOfMonth } from 'date-fns'

interface MonthSelectorProps {
  /** Current month in yyyy-MM format */
  currentMonth: string
}

export function MonthSelector({ currentMonth }: MonthSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedDate = parse(currentMonth + '-01', 'yyyy-MM-dd', new Date())
  const today = new Date()
  const currentMonthKey = format(startOfMonth(today), 'yyyy-MM')

  // Can't navigate to future months
  const isCurrentMonth = currentMonth === currentMonthKey
  const canGoNext = !isCurrentMonth

  const navigateToMonth = useCallback((monthKey: string) => {
    const params = new URLSearchParams(searchParams.toString())

    // Clean URL: omit month param for current month
    if (monthKey === currentMonthKey) {
      params.delete('month')
    } else {
      params.set('month', monthKey)
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.push(newUrl)
  }, [pathname, router, searchParams, currentMonthKey])

  const goPrev = useCallback(() => {
    const prevMonth = subMonths(selectedDate, 1)
    navigateToMonth(format(prevMonth, 'yyyy-MM'))
  }, [selectedDate, navigateToMonth])

  const goNext = useCallback(() => {
    if (!canGoNext) return
    const nextMonth = addMonths(selectedDate, 1)
    navigateToMonth(format(nextMonth, 'yyyy-MM'))
  }, [selectedDate, navigateToMonth, canGoNext])

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={goPrev}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
        aria-label="Previous month"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">
        {format(selectedDate, 'MMMM yyyy')}
      </span>

      <button
        onClick={goNext}
        disabled={!canGoNext}
        className={`p-1.5 rounded-lg transition-colors ${
          canGoNext
            ? 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            : 'text-gray-300 cursor-not-allowed'
        }`}
        aria-label="Next month"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}
