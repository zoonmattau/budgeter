'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Sparkles, Trophy, Target, PiggyBank, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { AccountLogo } from '@/components/ui/account-logo'
import { DebtPayoffChart } from '@/components/debt-planner/debt-payoff-chart'
import { InterestChart } from '@/components/debt-planner/interest-chart'
import { IncomeBreakdown } from '@/components/debt-planner/income-breakdown'
import { StrategyComparison } from '@/components/debt-planner/strategy-comparison'
import {
  calculatePayoffSchedule,
  compareStrategies,
  formatPayoffTime,
  type Debt,
  type PayoffStrategy,
} from '@/lib/debt-calculator'

interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  linkedAccountId: string | null
}

interface BudgetItem {
  id: string
  name: string
  amount: number
  icon: string
  isSavings: boolean
}

interface DebtPlannerClientProps {
  debts: Debt[]
  monthlyIncome: number
  monthlyBills: number
  budgetAllocations: number
  expenseAllocations?: number
  savingsAllocations?: number
  budgetItems?: BudgetItem[]
  minimumDebtPayments: number
  totalPaidOff: number
  progressPercent: number
  savingsGoals?: SavingsGoal[]
}

export function DebtPlannerClient({
  debts,
  monthlyIncome,
  monthlyBills: _monthlyBills,
  budgetAllocations,
  expenseAllocations = 0,
  savingsAllocations = 0,
  budgetItems = [],
  minimumDebtPayments,
  totalPaidOff,
  progressPercent,
  savingsGoals = [],
}: DebtPlannerClientProps) {
  const [strategy, setStrategy] = useState<PayoffStrategy>('avalanche')
  const [extraPayment, setExtraPayment] = useState(0)
  const [goalAllocations, setGoalAllocations] = useState<Record<string, number>>({})

  // Calculate projections based on current settings
  const projections = useMemo(
    () => calculatePayoffSchedule(debts, extraPayment, strategy),
    [debts, extraPayment, strategy]
  )

  // Compare strategies
  const comparison = useMemo(
    () => compareStrategies(debts, extraPayment),
    [debts, extraPayment]
  )

  // Summary stats
  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0)
  const monthsToPayoff = projections.length
  const totalInterest = projections.length > 0 ? projections[projections.length - 1].cumulativeInterest : 0

  // Calculate what happens with more/less extra payment
  const withoutExtra = useMemo(
    () => calculatePayoffSchedule(debts, 0, strategy),
    [debts, strategy]
  )
  const timeSaved = withoutExtra.length - monthsToPayoff
  const interestSaved = withoutExtra.length > 0
    ? withoutExtra[withoutExtra.length - 1].cumulativeInterest - totalInterest
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Debt Planner</h1>
          <p className="text-gray-500 text-sm">Your path to financial freedom</p>
        </div>
      </div>

      {/* Progress Card - Show the positive first! */}
      {totalPaidOff > 0 && (
        <div className="card bg-gradient-to-br from-sprout-50 to-bloom-50 border border-sprout-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-sprout-100 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-sprout-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">You&apos;ve paid off</p>
              <p className="text-2xl font-bold text-sprout-600">{formatCurrency(totalPaidOff)}</p>
            </div>
          </div>
          <div className="h-3 bg-white rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-sprout-400 to-sprout-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          <p className="text-sm text-sprout-700 text-center font-medium">
            {progressPercent.toFixed(0)}% of your debt journey complete!
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card bg-gradient-to-br from-sprout-50 to-green-50">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-sprout-500" />
            <p className="text-xs text-gray-500">Debt-Free In</p>
          </div>
          <p className="text-xl font-bold text-sprout-600">{formatPayoffTime(monthsToPayoff)}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-500">Remaining Debt</p>
          </div>
          <p className="text-xl font-bold text-gray-700">{formatCurrency(totalDebt)}</p>
        </div>
      </div>

      {/* Savings highlight */}
      {extraPayment > 0 && (timeSaved > 0 || interestSaved > 0) && (
        <div className="card bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-800">
                Extra {formatCurrency(extraPayment)}/month saves:
              </p>
              <div className="flex flex-wrap gap-4 mt-1">
                {timeSaved > 0 && (
                  <span className="text-sm text-amber-700">
                    <strong>{timeSaved}</strong> months sooner
                  </span>
                )}
                {interestSaved > 0 && (
                  <span className="text-sm text-amber-700">
                    <strong>{formatCurrency(interestSaved)}</strong> in interest
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debt List */}
      <div className="card">
        <h3 className="font-display font-semibold text-gray-900 mb-3">Your Debts</h3>
        <div className="divide-y divide-gray-50">
          {debts.map((debt, index) => (
            <div key={debt.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                {index + 1}
              </div>
              <AccountLogo
                institution={debt.institution}
                type={(debt.type as 'credit' | 'credit_card' | 'loan' | 'debt') || 'credit_card'}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{debt.name}</p>
                <p className="text-xs text-gray-400">
                  {debt.interestRate > 0 ? `${debt.interestRate}% p.a.` : 'No interest'}
                  {debt.minimumPayment > 0 && ` • Min: ${formatCurrency(debt.minimumPayment)}`}
                </p>
              </div>
              <p className="font-semibold text-red-600">{formatCurrency(debt.balance)}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
          Order: {strategy === 'avalanche' ? 'Highest interest rate first' : 'Smallest balance first'}
        </p>
      </div>

      {/* Income Breakdown & Slider */}
      <IncomeBreakdown
        monthlyIncome={monthlyIncome}
        budgetItems={budgetItems}
        expenseAllocations={expenseAllocations}
        savingsAllocations={savingsAllocations}
        minimumDebtPayments={minimumDebtPayments}
        extraPayment={extraPayment}
        onExtraPaymentChange={setExtraPayment}
      />

      {/* Goals Allocation */}
      {savingsGoals.length > 0 && (() => {
        const totalGoalAllocations = Object.values(goalAllocations).reduce((sum, a) => sum + a, 0)
        const remainingAfterDebt = monthlyIncome - budgetAllocations - minimumDebtPayments - extraPayment
        const remainingAfterGoals = remainingAfterDebt - totalGoalAllocations

        return (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-bloom-500" />
                <h3 className="font-display font-semibold text-gray-900">Save for Goals</h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Available</p>
                <p className={`font-bold ${remainingAfterGoals >= 0 ? 'text-sprout-600' : 'text-red-500'}`}>
                  {formatCurrency(remainingAfterGoals)}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {savingsGoals.map(goal => {
                const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
                const remaining = goal.targetAmount - goal.currentAmount
                const allocation = goalAllocations[goal.id] || 0

                return (
                  <div key={goal.id} className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{goal.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                          <span className="ml-2 text-gray-400">({Math.round(progress)}%)</span>
                        </p>
                      </div>
                      <Link
                        href={`/goals/${goal.id}`}
                        className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-bloom-500 rounded-full"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <div className="w-24">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={allocation || ''}
                            onChange={(e) => setGoalAllocations(prev => ({
                              ...prev,
                              [goal.id]: parseFloat(e.target.value) || 0
                            }))}
                            placeholder="0"
                            className="input pl-5 py-1.5 text-right text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {allocation > 0 && (
                      <p className="text-xs text-bloom-600 mt-2">
                        Goal reached in ~{Math.ceil((remaining - allocation) / allocation)} months at this rate
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {totalGoalAllocations > 0 && (
              <div className="p-3 bg-bloom-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-bloom-700">Total to Goals</span>
                  <span className="font-bold text-bloom-700">{formatCurrency(totalGoalAllocations)}/month</span>
                </div>
                <p className="text-xs text-bloom-600 mt-1">
                  Add these amounts to your goals each month to track your progress.
                </p>
              </div>
            )}
          </div>
        )
      })()}

      {/* Strategy Comparison */}
      <StrategyComparison
        avalanche={comparison.avalanche}
        snowball={comparison.snowball}
        selectedStrategy={strategy}
        onStrategyChange={setStrategy}
      />

      {/* Payoff Chart */}
      <DebtPayoffChart projections={projections} showIndividualDebts />

      {/* Interest Chart */}
      <InterestChart
        projections={projections}
        comparisonProjections={strategy === 'avalanche'
          ? calculatePayoffSchedule(debts, extraPayment, 'snowball')
          : calculatePayoffSchedule(debts, extraPayment, 'avalanche')
        }
        label={strategy === 'avalanche' ? 'Avalanche' : 'Snowball'}
        comparisonLabel={strategy === 'avalanche' ? 'Snowball' : 'Avalanche'}
      />

      {/* Final Summary */}
      <div className="card bg-gradient-to-br from-sprout-50 to-bloom-50">
        <h3 className="font-display font-semibold text-gray-900 mb-4">Your Debt-Free Plan</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Monthly Payment</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(minimumDebtPayments + extraPayment)}
            </p>
            <p className="text-xs text-gray-400">
              {formatCurrency(minimumDebtPayments)} min + {formatCurrency(extraPayment)} extra
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Time to Debt-Free</p>
            <p className="text-lg font-bold text-sprout-600">
              {formatPayoffTime(monthsToPayoff)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Interest</p>
            <p className="text-lg font-bold text-orange-600">
              {formatCurrency(totalInterest)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Strategy</p>
            <p className="text-lg font-bold text-bloom-600 capitalize">
              {strategy}
            </p>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="card">
        <h3 className="font-display font-semibold text-gray-900 mb-3">Tips to Pay Off Faster</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-bloom-500">•</span>
            Round up payments to the nearest $50 or $100
          </li>
          <li className="flex items-start gap-2">
            <span className="text-bloom-500">•</span>
            Apply tax refunds and bonuses to your debt
          </li>
          <li className="flex items-start gap-2">
            <span className="text-bloom-500">•</span>
            Negotiate lower interest rates with your lenders
          </li>
          <li className="flex items-start gap-2">
            <span className="text-bloom-500">•</span>
            Consider balance transfer cards for high-interest debt
          </li>
        </ul>
      </div>
    </div>
  )
}
