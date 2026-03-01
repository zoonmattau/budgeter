import { startOfMonth, endOfMonth, format, parse, isValid, isFuture } from 'date-fns'

export interface MonthParams {
  /** The first day of the selected month (yyyy-MM-dd) */
  monthStart: string
  /** The last day of the selected month (yyyy-MM-dd) */
  monthEnd: string
  /** For queries: today if current month, end of month if past month */
  dateRangeEnd: string
  /** Whether this is the current month */
  isCurrentMonth: boolean
  /** The month in yyyy-MM format */
  monthKey: string
}

/**
 * Parse a month param (e.g., "2026-01") and return date boundaries.
 * Returns current month if param is missing or invalid.
 */
export function parseMonthParam(monthParam?: string): MonthParams {
  const today = new Date()
  const currentMonthStart = startOfMonth(today)

  let selectedMonth: Date = currentMonthStart

  if (monthParam) {
    // Parse yyyy-MM format
    const parsed = parse(monthParam + '-01', 'yyyy-MM-dd', new Date())
    if (isValid(parsed) && !isFuture(startOfMonth(parsed))) {
      selectedMonth = startOfMonth(parsed)
    }
  }

  const monthStart = format(selectedMonth, 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')
  const isCurrentMonth = format(selectedMonth, 'yyyy-MM') === format(currentMonthStart, 'yyyy-MM')

  // For current month, limit to today; for past months, use full month
  const dateRangeEnd = isCurrentMonth
    ? format(today, 'yyyy-MM-dd')
    : monthEnd

  return {
    monthStart,
    monthEnd,
    dateRangeEnd,
    isCurrentMonth,
    monthKey: format(selectedMonth, 'yyyy-MM'),
  }
}
