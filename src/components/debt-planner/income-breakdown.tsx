'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface BudgetItem {
  id: string
  name: string
  amount: number
  icon: string
  isSavings: boolean
}

interface IncomeBreakdownProps {
  monthlyIncome: number
  monthlyBills?: number
  monthlyInterest?: number
  budgetItems?: BudgetItem[]
  expenseAllocations?: number
  savingsAllocations?: number
  minimumDebtPayments: number
  extraPayment: number
  onExtraPaymentChange: (value: number) => void
}

export function IncomeBreakdown({
  monthlyIncome,
  monthlyBills = 0,
  monthlyInterest = 0,
  budgetItems = [],
  expenseAllocations = 0,
  savingsAllocations = 0,
  minimumDebtPayments,
  extraPayment,
  onExtraPaymentChange,
}: IncomeBreakdownProps) {
  const [showExpenses, setShowExpenses] = useState(false)

  // Keywords for categorization
  const rentKeywords = ['rent', 'mortgage', 'housing', 'home loan']
  const subscriptionKeywords = ['subscription', 'netflix', 'spotify', 'streaming', 'membership', 'gym']

  // Separate into categories
  const rentItems = budgetItems.filter(b => !b.isSavings &&
    rentKeywords.some(k => b.name.toLowerCase().includes(k)))
  const subscriptionItems = budgetItems.filter(b => !b.isSavings &&
    subscriptionKeywords.some(k => b.name.toLowerCase().includes(k)))
  const otherExpenseItems = budgetItems.filter(b => !b.isSavings &&
    !rentKeywords.some(k => b.name.toLowerCase().includes(k)) &&
    !subscriptionKeywords.some(k => b.name.toLowerCase().includes(k)))
  const savingsItems = budgetItems.filter(b => b.isSavings)

  // Calculate totals
  const rentTotal = rentItems.reduce((sum, b) => sum + b.amount, 0)
  const subscriptionTotal = subscriptionItems.reduce((sum, b) => sum + b.amount, 0)
  const otherExpenseTotal = otherExpenseItems.reduce((sum, b) => sum + b.amount, 0)

  // Fixed costs = expenses + bills + interest + debt repayments
  const fixedCosts = expenseAllocations + monthlyBills + monthlyInterest + minimumDebtPayments

  // Available = income - fixed costs (savings is NOT a fixed cost)
  const available = monthlyIncome - fixedCosts

  // After extra debt payment
  const remaining = available - extraPayment

  // Max extra = all available (including budgeted savings)
  const maxExtra = Math.max(0, available)

  // Visual bar calculations
  const billsWidth = monthlyIncome > 0 ? (monthlyBills / monthlyIncome) * 100 : 0
  const interestWidth = monthlyIncome > 0 ? (monthlyInterest / monthlyIncome) * 100 : 0
  const rentWidth = monthlyIncome > 0 ? (rentTotal / monthlyIncome) * 100 : 0
  const subscriptionWidth = monthlyIncome > 0 ? (subscriptionTotal / monthlyIncome) * 100 : 0
  const otherExpenseWidth = monthlyIncome > 0 ? (otherExpenseTotal / monthlyIncome) * 100 : 0
  const repaymentWidth = monthlyIncome > 0 ? (minimumDebtPayments / monthlyIncome) * 100 : 0
  const extraWidth = monthlyIncome > 0 ? (extraPayment / monthlyIncome) * 100 : 0
  const savingsWidth = monthlyIncome > 0 ? (Math.max(0, savingsAllocations - extraPayment) / monthlyIncome) * 100 : 0
  const remainingWidth = Math.max(0, 100 - billsWidth - interestWidth - rentWidth - subscriptionWidth - otherExpenseWidth - repaymentWidth - extraWidth - savingsWidth)

  return (
    <div className="card">
      <h3 className="font-display font-semibold text-gray-900 mb-4">Monthly Income Breakdown</h3>

      {/* Visual bar */}
      <div className="h-8 rounded-xl overflow-hidden flex mb-4">
        {billsWidth > 0 && (
          <div
            className="bg-orange-400 flex items-center justify-center cursor-default"
            style={{ width: `${billsWidth}%` }}
            title={`Bills\n${formatCurrency(monthlyBills)}`}
          />
        )}
        {rentWidth > 0 && (
          <div
            className="bg-indigo-500 flex items-center justify-center cursor-default"
            style={{ width: `${rentWidth}%` }}
            title={`Rent/Mortgage\n${formatCurrency(rentTotal)}`}
          />
        )}
        {subscriptionWidth > 0 && (
          <div
            className="bg-purple-400 flex items-center justify-center cursor-default"
            style={{ width: `${subscriptionWidth}%` }}
            title={`Subscriptions\n${formatCurrency(subscriptionTotal)}`}
          />
        )}
        {otherExpenseWidth > 0 && (
          <div
            className="bg-blue-400 flex items-center justify-center cursor-default"
            style={{ width: `${otherExpenseWidth}%` }}
            title={`Other Expenses\n${formatCurrency(otherExpenseTotal)}`}
          />
        )}
        {interestWidth > 0 && (
          <div
            className="bg-amber-500 flex items-center justify-center cursor-default"
            style={{ width: `${interestWidth}%` }}
            title={`Interest Charges\n${formatCurrency(monthlyInterest)}`}
          />
        )}
        {repaymentWidth > 0 && (
          <div
            className="bg-red-400 flex items-center justify-center cursor-default"
            style={{ width: `${repaymentWidth}%` }}
            title={`Debt Repayments\n${formatCurrency(minimumDebtPayments)}`}
          />
        )}
        {savingsWidth > 0 && (
          <div
            className="bg-emerald-400 flex items-center justify-center cursor-default"
            style={{ width: `${savingsWidth}%` }}
            title={`Savings\n${formatCurrency(Math.max(0, savingsAllocations - extraPayment))}`}
          />
        )}
        {remainingWidth > 0 && (
          <div
            className="bg-gray-200 flex items-center justify-center cursor-default"
            style={{ width: `${remainingWidth}%` }}
            title={`Unallocated\n${formatCurrency(Math.max(0, remaining - Math.max(0, savingsAllocations - extraPayment)))}`}
          />
        )}
        {extraWidth > 0 && (
          <div
            className="bg-sprout-500 flex items-center justify-center cursor-default"
            style={{ width: `${extraWidth}%` }}
            title={`Extra to Debt\n${formatCurrency(extraPayment)}`}
          />
        )}
      </div>

      {/* Detailed breakdown */}
      <div className="space-y-3 mb-4">
        {/* Income */}
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <span className="font-medium text-gray-900">Monthly Income</span>
          <span className="font-bold text-gray-900">{formatCurrency(monthlyIncome)}</span>
        </div>

        {/* Bills */}
        {monthlyBills > 0 && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-400" />
              <span className="text-sm text-gray-600">Bills</span>
            </div>
            <span className="text-sm font-medium text-gray-700">-{formatCurrency(monthlyBills)}</span>
          </div>
        )}

        {/* Rent/Mortgage */}
        {rentTotal > 0 && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-indigo-500" />
              <span className="text-sm text-gray-600">Rent/Mortgage</span>
            </div>
            <span className="text-sm font-medium text-gray-700">-{formatCurrency(rentTotal)}</span>
          </div>
        )}

        {/* Subscriptions */}
        {subscriptionTotal > 0 && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple-400" />
              <span className="text-sm text-gray-600">Subscriptions</span>
            </div>
            <span className="text-sm font-medium text-gray-700">-{formatCurrency(subscriptionTotal)}</span>
          </div>
        )}

        {/* Other Expenses */}
        {otherExpenseItems.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowExpenses(!showExpenses)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-400" />
                <span className="text-sm text-gray-600">Other Expenses</span>
                {showExpenses ? (
                  <ChevronUp className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                )}
              </div>
              <span className="text-sm font-medium text-gray-700">-{formatCurrency(otherExpenseTotal)}</span>
            </button>
            {showExpenses && (
              <div className="ml-5 pl-3 border-l-2 border-blue-100 space-y-1">
                {otherExpenseItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">{item.name}</span>
                    <span className="text-gray-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Interest charges */}
        {monthlyInterest > 0 && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-sm text-gray-600">Interest Charges</span>
            </div>
            <span className="text-sm font-medium text-gray-700">-{formatCurrency(monthlyInterest)}</span>
          </div>
        )}

        {/* Debt repayments */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-400" />
            <span className="text-gray-600">Debt Repayments</span>
          </div>
          <span className="font-medium text-red-600">-{formatCurrency(minimumDebtPayments)}</span>
        </div>

        {/* Available after fixed costs */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100 bg-sprout-50 -mx-4 px-4 py-2">
          <span className="font-medium text-sprout-700">Available for Savings/Debt</span>
          <span className="font-bold text-sprout-600">{formatCurrency(available)}</span>
        </div>

        {/* Savings categories */}
        {savingsItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Budgeted Savings</p>
            {savingsItems.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{item.name}</span>
                <span className="text-emerald-600">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Extra payment slider */}
      <div className="pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Extra Debt Payment</label>
          <span className="text-lg font-bold text-sprout-600">{formatCurrency(extraPayment)}</span>
        </div>
        <input
          type="range"
          min="0"
          max={maxExtra}
          step="10"
          value={extraPayment}
          onChange={(e) => onExtraPaymentChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sprout-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>$0</span>
          <span>Max: {formatCurrency(maxExtra)}</span>
        </div>

        {extraPayment > 0 && extraPayment <= savingsAllocations && (
          <p className="text-xs text-amber-600 mt-2">
            This uses {formatCurrency(extraPayment)} from your budgeted savings
          </p>
        )}

        {extraPayment > savingsAllocations && (
          <p className="text-xs text-amber-600 mt-2">
            Using all {formatCurrency(savingsAllocations)} savings + {formatCurrency(extraPayment - savingsAllocations)} extra
          </p>
        )}
      </div>
    </div>
  )
}
