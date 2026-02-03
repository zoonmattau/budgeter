'use client'

import Link from 'next/link'
import { Lightbulb, TrendingDown, ChevronRight, Calculator } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { AccountLogo } from '@/components/ui/account-logo'

interface DebtAccount {
  id: string
  name: string
  type: string
  balance: number
  interest_rate: number | null
  due_date: number | null
  minimum_payment: number | null
  payment_frequency: string | null
  institution?: string | null
}

interface DebtRepaymentsProps {
  accounts: DebtAccount[]
  availableFunds: number
}

interface PaymentSuggestion {
  account: DebtAccount
  suggestedAmount: number
  minimumAmount: number
  reason: string
  priority: 'high' | 'medium' | 'low'
  daysUntilDue: number | null
}

export function DebtRepayments({ accounts, availableFunds }: DebtRepaymentsProps) {
  // Filter to only debt accounts (credit cards and loans)
  const debtAccounts = accounts.filter(a =>
    (a.type === 'credit' || a.type === 'credit_card' || a.type === 'loan' || a.type === 'debt') &&
    a.balance > 0
  )

  if (debtAccounts.length === 0) {
    return null // Don't show section if no debts
  }

  // Calculate payment suggestions
  const suggestions = calculatePaymentSuggestions(debtAccounts, availableFunds)
  const totalSuggested = suggestions.reduce((sum, s) => sum + s.suggestedAmount, 0)
  const totalMinimum = suggestions.reduce((sum, s) => sum + s.minimumAmount, 0)

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-gray-900">Debt Repayments</h2>
        <Link href="/debt-planner" className="text-sm text-bloom-600 hover:text-bloom-700 font-medium flex items-center gap-1">
          <Calculator className="w-3.5 h-3.5" />
          Plan
        </Link>
      </div>

      <div className="space-y-3">
        {/* Summary Card */}
        <div className="card bg-gradient-to-br from-red-50 to-coral-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-gray-700">This Month</span>
            </div>
            {availableFunds > 0 && (
              <span className="text-xs bg-sprout-100 text-sprout-700 px-2 py-1 rounded-full">
                {formatCurrency(availableFunds)} available
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Minimum Due</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalMinimum)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Suggested Payment</p>
              <p className="text-lg font-bold text-sprout-600">{formatCurrency(totalSuggested)}</p>
            </div>
          </div>
        </div>

        {/* Payment suggestions */}
        <div className="card divide-y divide-gray-50">
          {suggestions.map((suggestion) => {
            return (
              <Link
                key={suggestion.account.id}
                href={`/net-worth/${suggestion.account.id}/edit`}
                className="block py-3 first:pt-0 last:pb-0 hover:bg-gray-50 -mx-4 px-4 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AccountLogo
                    institution={suggestion.account.institution}
                    type={suggestion.account.type as 'credit' | 'credit_card' | 'loan' | 'debt'}
                    size="md"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{suggestion.account.name}</p>
                      {suggestion.account.interest_rate && (
                        <span className="text-xs text-gray-400">
                          {suggestion.account.interest_rate}% p.a.
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Balance: {formatCurrency(suggestion.account.balance)}
                      {suggestion.daysUntilDue !== null && suggestion.daysUntilDue <= 7 && (
                        <span className={`ml-2 ${suggestion.daysUntilDue <= 3 ? 'text-red-500 font-medium' : 'text-amber-500'}`}>
                          • Due in {suggestion.daysUntilDue} day{suggestion.daysUntilDue !== 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-sprout-600">{formatCurrency(suggestion.suggestedAmount)}</p>
                    {suggestion.minimumAmount > 0 && suggestion.suggestedAmount > suggestion.minimumAmount && (
                      <p className="text-xs text-gray-400">Min: {formatCurrency(suggestion.minimumAmount)}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>

                {/* Suggestion reason */}
                {suggestion.reason && (
                  <div className="mt-2 flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                    <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700">{suggestion.reason}</p>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function calculatePaymentSuggestions(
  accounts: DebtAccount[],
  availableFunds: number
): PaymentSuggestion[] {
  const today = new Date()
  const currentDay = today.getDate()

  // Sort accounts by priority:
  // 1. Due soon (within 7 days)
  // 2. Higher interest rate
  // 3. Lower balance (debt snowball for quick wins)
  const sortedAccounts = [...accounts].sort((a, b) => {
    const aDaysUntilDue = calculateDaysUntilDue(a.due_date, currentDay)
    const bDaysUntilDue = calculateDaysUntilDue(b.due_date, currentDay)

    // Priority 1: Due soon
    if (aDaysUntilDue !== null && bDaysUntilDue !== null) {
      if (aDaysUntilDue <= 7 && bDaysUntilDue > 7) return -1
      if (bDaysUntilDue <= 7 && aDaysUntilDue > 7) return 1
    }

    // Priority 2: Higher interest rate (debt avalanche)
    const aRate = a.interest_rate || 0
    const bRate = b.interest_rate || 0
    if (aRate !== bRate) return bRate - aRate

    // Priority 3: Lower balance (debt snowball)
    return a.balance - b.balance
  })

  let remainingFunds = availableFunds
  const suggestions: PaymentSuggestion[] = []

  for (const account of sortedAccounts) {
    const minimumPayment = account.minimum_payment || 0
    const daysUntilDue = calculateDaysUntilDue(account.due_date, currentDay)

    // Determine priority
    let priority: 'high' | 'medium' | 'low' = 'low'
    if (daysUntilDue !== null && daysUntilDue <= 3) {
      priority = 'high'
    } else if ((account.interest_rate || 0) >= 15 || (daysUntilDue !== null && daysUntilDue <= 7)) {
      priority = 'medium'
    }

    // Calculate suggested amount
    let suggestedAmount = minimumPayment
    let reason = ''

    // If there's available funds beyond minimum
    if (remainingFunds > minimumPayment) {
      const interestRate = account.interest_rate || 0

      if (interestRate >= 20) {
        // High interest - suggest paying as much as possible
        const extraPayment = Math.min(remainingFunds - minimumPayment, account.balance - minimumPayment)
        suggestedAmount = minimumPayment + extraPayment * 0.5 // Suggest 50% of available
        reason = `High interest (${interestRate}%) - paying extra saves money on interest`
      } else if (interestRate >= 15) {
        // Medium-high interest
        const extraPayment = Math.min(remainingFunds - minimumPayment, account.balance - minimumPayment)
        suggestedAmount = minimumPayment + extraPayment * 0.3
        reason = `Consider paying extra to reduce ${interestRate}% interest charges`
      } else if (account.balance < 500 && remainingFunds >= account.balance) {
        // Small balance - suggest paying it off
        suggestedAmount = account.balance
        reason = 'Small balance - pay it off for a quick win!'
      } else if (minimumPayment > 0) {
        // Just suggest minimum
        suggestedAmount = minimumPayment
      }
    }

    // Ensure suggested amount doesn't exceed balance
    suggestedAmount = Math.min(suggestedAmount, account.balance)

    // Round to nearest $10 (unless it would exceed balance)
    const rounded = Math.round(suggestedAmount / 10) * 10
    suggestedAmount = Math.min(rounded, account.balance)

    // Deduct from remaining funds
    remainingFunds = Math.max(0, remainingFunds - suggestedAmount)

    suggestions.push({
      account,
      suggestedAmount,
      minimumAmount: minimumPayment,
      reason,
      priority,
      daysUntilDue,
    })
  }

  return suggestions
}

function calculateDaysUntilDue(dueDate: number | null, currentDay: number): number | null {
  if (!dueDate) return null

  let daysUntil = dueDate - currentDay
  if (daysUntil < 0) {
    // Due date has passed this month, calculate for next month
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    daysUntil = daysInMonth - currentDay + dueDate
  }

  return daysUntil
}
