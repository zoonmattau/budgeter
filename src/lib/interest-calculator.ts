import { addWeeks, addMonths, differenceInWeeks, differenceInMonths, format, parseISO, startOfDay } from 'date-fns'
import type { Tables } from '@/lib/database.types'

type Account = Tables<'accounts'>

interface InterestResult {
  shouldApply: boolean
  periodsToApply: number
  interestAmount: number
  newBalance: number
  nextDueDate: Date
}

/**
 * Calculate if interest needs to be applied and how much
 */
export function calculateInterestDue(account: Account): InterestResult {
  const today = startOfDay(new Date())
  const result: InterestResult = {
    shouldApply: false,
    periodsToApply: 0,
    interestAmount: 0,
    newBalance: account.balance,
    nextDueDate: today,
  }

  // Only apply to loans/debts with interest rate and payment frequency
  if (!account.interest_rate || account.interest_rate <= 0) {
    return result
  }

  if (account.type !== 'loan' && account.type !== 'debt') {
    return result
  }

  if (!account.payment_frequency) {
    return result
  }

  // Determine the last applied date (or use account creation if never applied)
  const lastApplied = account.interest_last_applied
    ? startOfDay(parseISO(account.interest_last_applied))
    : startOfDay(parseISO(account.created_at))

  // Calculate periods elapsed based on frequency
  let periodsElapsed = 0
  let periodInterestRate = 0

  switch (account.payment_frequency) {
    case 'weekly':
      periodsElapsed = differenceInWeeks(today, lastApplied)
      // Weekly rate = annual rate / 52
      periodInterestRate = account.interest_rate / 100 / 52
      result.nextDueDate = addWeeks(lastApplied, periodsElapsed + 1)
      break
    case 'fortnightly':
      periodsElapsed = Math.floor(differenceInWeeks(today, lastApplied) / 2)
      // Fortnightly rate = annual rate / 26
      periodInterestRate = account.interest_rate / 100 / 26
      result.nextDueDate = addWeeks(lastApplied, (periodsElapsed + 1) * 2)
      break
    case 'monthly':
    default:
      periodsElapsed = differenceInMonths(today, lastApplied)
      // Monthly rate = annual rate / 12
      periodInterestRate = account.interest_rate / 100 / 12
      result.nextDueDate = addMonths(lastApplied, periodsElapsed + 1)
      break
  }

  if (periodsElapsed <= 0) {
    return result
  }

  // Calculate compound interest for all missed periods
  let balance = account.balance
  let totalInterest = 0

  for (let i = 0; i < periodsElapsed; i++) {
    const periodInterest = balance * periodInterestRate
    totalInterest += periodInterest
    balance += periodInterest
  }

  result.shouldApply = true
  result.periodsToApply = periodsElapsed
  result.interestAmount = Math.round(totalInterest * 100) / 100 // Round to 2 decimal places
  result.newBalance = Math.round(balance * 100) / 100

  return result
}

/**
 * Format the interest application description
 */
export function formatInterestDescription(
  account: Account,
  result: InterestResult
): string {
  const frequencyLabel = {
    weekly: 'week',
    fortnightly: 'fortnight',
    monthly: 'month',
  }[account.payment_frequency || 'monthly']

  const plural = result.periodsToApply > 1 ? 's' : ''

  return `${account.interest_rate}% p.a. interest for ${result.periodsToApply} ${frequencyLabel}${plural}`
}

/**
 * Get the date string for updating interest_last_applied
 */
export function getInterestAppliedDate(
  account: Account,
  periodsApplied: number
): string {
  const lastApplied = account.interest_last_applied
    ? parseISO(account.interest_last_applied)
    : parseISO(account.created_at)

  let newDate: Date

  switch (account.payment_frequency) {
    case 'weekly':
      newDate = addWeeks(lastApplied, periodsApplied)
      break
    case 'fortnightly':
      newDate = addWeeks(lastApplied, periodsApplied * 2)
      break
    case 'monthly':
    default:
      newDate = addMonths(lastApplied, periodsApplied)
      break
  }

  return format(newDate, 'yyyy-MM-dd')
}
