import { clsx, type ClassValue } from 'clsx'
import { differenceInMonths } from 'date-fns'
import type { Tables } from './database.types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatCompactCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (num >= 1000) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(num)
  }
  return formatCurrency(num)
}

export function calculateLikelihood(goal: Tables<'goals'>): 'on_track' | 'at_risk' | 'behind' {
  if (!goal.deadline) return 'on_track'

  const remaining = Number(goal.target_amount) - Number(goal.current_amount)
  if (remaining <= 0) return 'on_track'

  const today = new Date()
  const deadline = new Date(goal.deadline)
  const monthsRemaining = differenceInMonths(deadline, today)

  if (monthsRemaining <= 0) return 'behind'

  // Simple calculation: assume user needs to save evenly
  // In reality, this would use historical data
  const requiredMonthly = remaining / monthsRemaining

  // Get progress rate (how much saved per month since goal created)
  const goalCreated = new Date(goal.created_at)
  const monthsSinceCreated = Math.max(1, differenceInMonths(today, goalCreated))
  const avgMonthlySaved = Number(goal.current_amount) / monthsSinceCreated

  // If no history, assume they can hit the target
  if (avgMonthlySaved === 0 && Number(goal.current_amount) === 0) {
    return 'on_track'
  }

  const ratio = avgMonthlySaved / requiredMonthly

  if (ratio >= 0.9) return 'on_track'
  if (ratio >= 0.6) return 'at_risk'
  return 'behind'
}

export function getRequiredMonthlySavings(goal: Tables<'goals'>): number | null {
  if (!goal.deadline) return null

  const remaining = Number(goal.target_amount) - Number(goal.current_amount)
  if (remaining <= 0) return 0

  const deadline = new Date(goal.deadline)
  const monthsRemaining = differenceInMonths(deadline, new Date())

  if (monthsRemaining <= 0) return remaining

  return remaining / monthsRemaining
}

export function getProgressPercentage(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.min((current / target) * 100, 100)
}
