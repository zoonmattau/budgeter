import { clsx, type ClassValue } from 'clsx'
import { differenceInMonths } from 'date-fns'
import type { Tables } from './database.types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Currency configuration - maps currency code to locale
const CURRENCY_LOCALES: Record<string, string> = {
  AUD: 'en-AU',
  USD: 'en-US',
  GBP: 'en-GB',
  EUR: 'de-DE',
  NZD: 'en-NZ',
  CAD: 'en-CA',
  JPY: 'ja-JP',
  INR: 'en-IN',
  SGD: 'en-SG',
}

// Default currency - can be overridden per-call or globally
let defaultCurrency = 'AUD'

export function setDefaultCurrency(currency: string): void {
  defaultCurrency = currency
}

export function getDefaultCurrency(): string {
  return defaultCurrency
}

export function formatCurrency(amount: number | string, currency?: string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  const currencyCode = currency || defaultCurrency
  const locale = CURRENCY_LOCALES[currencyCode] || 'en-AU'

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatCompactCurrency(amount: number | string, currency?: string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  const currencyCode = currency || defaultCurrency
  const locale = CURRENCY_LOCALES[currencyCode] || 'en-AU'

  if (num >= 1000) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(num)
  }
  return formatCurrency(num, currencyCode)
}

export function calculateLikelihood(goal: Tables<'goals'>): 'on_track' | 'at_risk' | 'behind' {
  if (!goal.deadline) return 'on_track'

  const targetAmount = Number(goal.target_amount) || 0
  const currentAmount = Number(goal.current_amount) || 0
  const remaining = targetAmount - currentAmount

  if (remaining <= 0) return 'on_track'

  const today = new Date()
  const deadline = new Date(goal.deadline)

  // Validate deadline is a valid date
  if (isNaN(deadline.getTime())) return 'on_track'

  const monthsRemaining = differenceInMonths(deadline, today)

  if (monthsRemaining <= 0) return 'behind'

  // Simple calculation: assume user needs to save evenly
  const requiredMonthly = remaining / monthsRemaining

  // Validate created_at date
  const goalCreated = new Date(goal.created_at)
  if (isNaN(goalCreated.getTime())) return 'on_track'

  // Get progress rate (how much saved per month since goal created)
  const monthsSinceCreated = Math.max(1, differenceInMonths(today, goalCreated))
  const avgMonthlySaved = currentAmount / monthsSinceCreated

  // If no history, assume they can hit the target
  if (avgMonthlySaved === 0 && currentAmount === 0) {
    return 'on_track'
  }

  // Avoid division by zero
  if (requiredMonthly <= 0) return 'on_track'

  const ratio = avgMonthlySaved / requiredMonthly

  if (ratio >= 0.9) return 'on_track'
  if (ratio >= 0.6) return 'at_risk'
  return 'behind'
}

export function getRequiredMonthlySavings(goal: Tables<'goals'>): number | null {
  if (!goal.deadline) return null

  const targetAmount = Number(goal.target_amount) || 0
  const currentAmount = Number(goal.current_amount) || 0
  const remaining = targetAmount - currentAmount

  if (remaining <= 0) return 0

  const deadline = new Date(goal.deadline)

  // Validate deadline is a valid date
  if (isNaN(deadline.getTime())) return null

  const monthsRemaining = differenceInMonths(deadline, new Date())

  // If deadline has passed or is this month, return full remaining amount
  if (monthsRemaining <= 0) return remaining

  return remaining / monthsRemaining
}

export function getProgressPercentage(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.min((current / target) * 100, 100)
}
