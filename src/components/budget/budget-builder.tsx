'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Wand2, Wallet, Users, AlertCircle, ChevronDown, ChevronUp, Calendar, Home, Check, Target, Gift, Plane, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { CategoryChip } from '@/components/ui/category-chip'
import { IncomeEditor } from '@/components/budget/income-editor'
import { BudgetWizard } from '@/components/budget/budget-wizard'
import { MemberBreakdownInline } from '@/components/ui/member-breakdown'
import { createClient } from '@/lib/supabase/client'
import { format, differenceInDays, addWeeks, addMonths } from 'date-fns'
import type { Tables } from '@/lib/database.types'
import type { ViewScope, HouseholdMember } from '@/lib/scope-context'
import type { MemberSpending } from '@/components/ui/member-breakdown'

interface MemberContribution {
  user_id: string
  display_name: string | null
  contribution_amount: number
  contribution_frequency: string
}

interface Bill {
  id: string
  name: string
  amount: number
  frequency: string
  next_due: string
  category_id: string
  is_active: boolean
  is_one_off?: boolean
  saved_amount?: number
}

interface Transaction {
  id: string
  description: string
  amount: number
  date: string
  category_id: string
}

interface DebtAccount {
  id: string
  name: string
  type: string
  balance: number
  minimum_payment: number | null
  payment_frequency: string | null
}

interface SavingsGoal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  icon: string | null
  color: string | null
  goal_type: string
}

interface BankAccount {
  id: string
  name: string
  type: string
  balance: number
}

interface BudgetBuilderProps {
  categories: Tables<'categories'>[]
  budgets: Tables<'budgets'>[]
  incomeEntries: Tables<'income_entries'>[]
  spentByCategory: Record<string, number>
  spentByMemberByCategory?: Record<string, Record<string, number>>
  currentMonth: string
  scope?: ViewScope
  householdId?: string | null
  members?: HouseholdMember[]
  currentUserId?: string
  householdContributions?: number
  memberContributions?: MemberContribution[]
  userMonthlyContribution?: number
  bills?: Bill[]
  transactionsByCategory?: Record<string, Transaction[]>
  debtAccounts?: DebtAccount[]
  userContribution?: number
  userContributionFrequency?: string
  savingsGoals?: SavingsGoal[]
  bankAccounts?: BankAccount[]
  savedExtraDebtPayment?: number
}

export function BudgetBuilder({
  categories,
  budgets,
  incomeEntries,
  spentByCategory,
  spentByMemberByCategory = {},
  currentMonth,
  scope = 'personal',
  householdId,
  members = [],
  currentUserId,
  householdContributions = 0,
  memberContributions = [],
  userMonthlyContribution = 0,
  bills = [],
  transactionsByCategory = {},
  debtAccounts = [],
  userContribution = 0,
  userContributionFrequency = 'monthly',
  savingsGoals = [],
  bankAccounts: _bankAccounts = [],
  savedExtraDebtPayment = 0,
}: BudgetBuilderProps) {
  const router = useRouter()
  const supabase = createClient()
  const isHousehold = scope === 'household'

  // In household view: use combined contributions as income
  // In personal view: use income entries
  const personalIncome = incomeEntries.reduce((sum, e) => sum + Number(e.amount), 0)
  const totalIncome = isHousehold ? householdContributions : personalIncome
  const hasNoBudget = budgets.length === 0

  // Show wizard for first-time users
  const [showWizard, setShowWizard] = useState(hasNoBudget && totalIncome > 0 && categories.length > 0)

  const frequencyToMonthly: Record<string, number> = {
    weekly: 4.33,
    fortnightly: 2.17,
    monthly: 1,
    quarterly: 1 / 3,
    yearly: 1 / 12,
  }

  // Calculate monthly debt payments
  const monthlyDebtPayments = debtAccounts.reduce((total, account) => {
    if (!account.minimum_payment) return total
    const frequency = account.payment_frequency || 'monthly'
    const multiplier = frequencyToMonthly[frequency] || 1
    return total + (Number(account.minimum_payment) * multiplier)
  }, 0)

  // Sinking funds: quarterly/yearly bills (set aside monthly)
  const infrequentBills = bills
    .filter(b =>
      b.is_active &&
      !b.is_one_off &&
      (b.frequency === 'quarterly' || b.frequency === 'yearly')
    )
    .sort((a, b) => {
      const dateA = new Date(a.next_due).getTime()
      const dateB = new Date(b.next_due).getTime()
      if (dateA !== dateB) return dateA - dateB
      return Number(b.amount) - Number(a.amount)
    })
  const monthlySinkingFunds = infrequentBills.reduce((sum, bill) => {
    const divisor = bill.frequency === 'yearly' ? 12 : 3
    return sum + (Number(bill.amount) / divisor)
  }, 0)

  // Filter out categories covered by the Fixed Bills section to avoid double-counting
  const fixedBillCategoryNames = ['subscriptions', 'subscription', 'fixed bills', 'bills', 'bills & subscriptions']
  const budgetCategories = categories.filter(c =>
    !fixedBillCategoryNames.includes(c.name.toLowerCase())
  )

  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    budgets.forEach(b => {
      // Skip allocations for categories handled by Fixed Bills
      const isFixedBillCat = categories.find(c => c.id === b.category_id && fixedBillCategoryNames.includes(c.name.toLowerCase()))
      if (!isFixedBillCat) {
        initial[b.category_id] = Number(b.allocated)
      }
    })
    return initial
  })
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [extraDebtPayment, setExtraDebtPayment] = useState(savedExtraDebtPayment)
  const [sinkingFundsExpanded, setSinkingFundsExpanded] = useState(false)
  const [editingContribution, setEditingContribution] = useState(false)
  const [contributionAmount, setContributionAmount] = useState(userContribution)
  const [contributionFreq, setContributionFreq] = useState(userContributionFrequency)
  const [savingContribution, setSavingContribution] = useState(false)

  const totalAllocated = Object.values(allocations).reduce((sum, a) => sum + a, 0)
  const totalFixedCosts = monthlySinkingFunds + monthlyDebtPayments + extraDebtPayment
  const totalCommitted = totalAllocated + totalFixedCosts
  const unallocated = totalIncome - totalCommitted
  const isBalanced = Math.abs(unallocated) < 0.01

  // Calculate total debt and savings allocation for smart suggestions
  const totalDebtBalance = debtAccounts.reduce((sum, a) => sum + Number(a.balance), 0)
  const savingsCategory = budgetCategories.find(c =>
    c.name.toLowerCase().includes('saving') || c.name.toLowerCase().includes('emergency')
  )
  const savingsAllocation = savingsCategory ? (allocations[savingsCategory.id] || 0) : 0
  const hasDebtAndSavings = totalDebtBalance > 0 && savingsAllocation > 0

  function handleReset() {
    const hasAllocations = Object.values(allocations).some(a => a > 0)
    if (hasAllocations) {
      const confirmed = window.confirm(
        'Are you sure you want to reset all budget allocations? This will clear all category amounts.'
      )
      if (!confirmed) return
    }
    setAllocations({})
  }

  function handleWizardComplete() {
    setShowWizard(false)
    router.refresh()
  }

  // Show the step-by-step wizard
  if (showWizard) {
    return (
      <BudgetWizard
        categories={categories}
        totalIncome={totalIncome}
        currentMonth={currentMonth}
        onComplete={handleWizardComplete}
        onCancel={() => setShowWizard(false)}
      />
    )
  }

  async function handleSave(overrides?: { extraDebt?: number; allocs?: Record<string, number> }) {
    const extraDebt = overrides?.extraDebt !== undefined ? overrides.extraDebt : extraDebtPayment
    const saveAllocations = overrides?.allocs || allocations
    setSaving(true)
    setSaveSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    // Delete existing budgets for this month
    if (isHousehold && householdId) {
      const { error: deleteError } = await supabase
        .from('budgets')
        .delete()
        .eq('household_id', householdId)
        .eq('month', currentMonth)

      if (deleteError) {
        console.error('Error deleting budgets:', deleteError)
        setSaving(false)
        return
      }
    } else {
      const { error: deleteError } = await supabase
        .from('budgets')
        .delete()
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .is('household_id', null)

      if (deleteError) {
        console.error('Error deleting budgets:', deleteError)
        setSaving(false)
        return
      }
    }

    const inserts = Object.entries(saveAllocations)
      .filter(([, allocated]) => allocated > 0)
      .map(([categoryId, allocated]) => ({
        user_id: user.id,
        household_id: isHousehold ? householdId : null,
        category_id: categoryId,
        month: currentMonth,
        allocated,
      }))

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from('budgets').insert(inserts)
      if (insertError) {
        console.error('Error inserting budgets:', insertError)
        setSaving(false)
        return
      }
    }

    // Save budget settings (extra debt payment) - delete + insert to handle NULL household_id
    if (isHousehold && householdId) {
      await supabase
        .from('budget_settings')
        .delete()
        .eq('household_id', householdId)
        .eq('month', currentMonth)
    } else {
      await supabase
        .from('budget_settings')
        .delete()
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .is('household_id', null)
    }

    const { error: settingsError } = await supabase
      .from('budget_settings')
      .insert({
        user_id: user.id,
        household_id: isHousehold ? householdId : null,
        month: currentMonth,
        extra_debt_payment: extraDebt,
      })

    if (settingsError) {
      console.error('Error saving budget settings:', settingsError)
    }

    setSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
    router.refresh()
  }

  function handleAllocationChange(categoryId: string, value: string) {
    const num = parseFloat(value) || 0
    setAllocations(prev => ({ ...prev, [categoryId]: num }))
  }

  function getMemberBreakdown(categoryId: string): MemberSpending[] {
    const categorySpending = spentByMemberByCategory[categoryId] || {}
    return members.map(member => ({
      userId: member.user_id,
      displayName: member.user_id === currentUserId ? 'You' : member.display_name,
      amount: categorySpending[member.user_id] || 0,
    })).filter(m => m.amount > 0)
  }

  return (
    <div className="space-y-4">
      {/* Income & Unallocated Header */}
      <div className="card bg-gradient-to-br from-sprout-50 to-bloom-50">
        <div className="flex items-center justify-between mb-4">
          {isHousehold ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-bloom-600" />
                <p className="text-sm text-gray-500">Combined Contributions</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(householdContributions)}</p>
            </div>
          ) : (
            <IncomeEditor
              incomeEntries={incomeEntries}
              currentMonth={currentMonth}
              onUpdate={() => router.refresh()}
            />
          )}
          <div className="text-right">
            <p className="text-sm text-gray-500">To Allocate</p>
            <p className={`text-2xl font-bold ${unallocated > 0 ? 'text-coral-500' : unallocated < 0 ? 'text-red-500' : 'text-sprout-500'}`}>
              {formatCurrency(Math.abs(unallocated))}
              {unallocated < 0 && ' over'}
            </p>
          </div>
        </div>

        {/* Zero-based progress */}
        <div className="h-3 bg-white rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isBalanced ? 'bg-sprout-500' : unallocated < 0 ? 'bg-red-500' : 'bg-bloom-500'
            }`}
            style={{ width: `${Math.min((totalCommitted / totalIncome) * 100, 100)}%` }}
          />
        </div>

        {isBalanced && (
          <p className="text-center text-sprout-600 font-medium text-sm mt-3">
            Every dollar has a job!
          </p>
        )}

        {/* Quick actions */}
        {totalIncome > 0 && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-white/30">
            <button
              onClick={() => setShowWizard(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <Wand2 className="w-3 h-3" />
              Step-by-Step Guide
            </button>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Unallocated Funds Suggestions */}
      {unallocated > 0.01 && totalIncome > 0 && (
        <div className="card bg-gradient-to-br from-coral-50 to-amber-50 border border-coral-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-coral-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-coral-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-coral-700">
                {formatCurrency(unallocated)} left to allocate
              </p>
              <p className="text-xs mt-1 text-coral-600">
                Give every dollar a job to stay on track. Here are some ideas:
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {(() => {
              const savingsCat = budgetCategories.find(c =>
                c.name.toLowerCase().includes('saving') ||
                c.name.toLowerCase().includes('emergency')
              )
              if (!savingsCat) return null
              return (
                <button
                  onClick={() => {
                    const newAllocations = {
                      ...allocations,
                      [savingsCat.id]: (allocations[savingsCat.id] || 0) + unallocated
                    }
                    setAllocations(newAllocations)
                    handleSave({ allocs: newAllocations })
                  }}
                  className="w-full flex items-center justify-between p-3 bg-white hover:bg-sprout-50 border border-coral-200 rounded-lg transition-colors group"
                >
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-sprout-700">
                      Add to {savingsCat.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Boost your savings by {formatCurrency(unallocated)}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-sprout-600 bg-sprout-100 px-2 py-1 rounded">
                    +{formatCurrency(unallocated)}
                  </span>
                </button>
              )
            })()}

            {debtAccounts.length > 0 && (
              <button
                onClick={() => {
                  const newAmount = extraDebtPayment + unallocated
                  setExtraDebtPayment(newAmount)
                  handleSave({ extraDebt: newAmount })
                }}
                className="w-full flex items-center justify-between p-3 bg-white hover:bg-amber-50 border border-coral-200 rounded-lg transition-colors group"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-amber-700">
                    Pay down debt faster
                  </p>
                  <p className="text-xs text-gray-500">
                    Add {formatCurrency(unallocated)} extra to debt repayment
                  </p>
                </div>
                <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded">
                  +{formatCurrency(unallocated)}
                </span>
              </button>
            )}

            {(() => {
              const underfunded = budgetCategories.filter(c => {
                const allocated = allocations[c.id] || 0
                const spent = spentByCategory[c.id] || 0
                return spent > allocated
              })
              if (underfunded.length === 0) return null
              const perCategory = Math.floor(unallocated / underfunded.length)
              return (
                <button
                  onClick={() => {
                    let remaining = unallocated
                    setAllocations(prev => {
                      const updated = { ...prev }
                      underfunded.forEach((c, i) => {
                        const amount = i === underfunded.length - 1
                          ? remaining
                          : perCategory
                        updated[c.id] = (updated[c.id] || 0) + amount
                        remaining -= amount
                      })
                      return updated
                    })
                  }}
                  className="w-full flex items-center justify-between p-3 bg-white hover:bg-bloom-50 border border-coral-200 rounded-lg transition-colors group"
                >
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-bloom-700">
                      Cover overspent categories
                    </p>
                    <p className="text-xs text-gray-500">
                      Top up {underfunded.length} categor{underfunded.length === 1 ? 'y' : 'ies'} where spending exceeds budget
                    </p>
                  </div>
                  <span className="text-xs font-medium text-bloom-600 bg-bloom-100 px-2 py-1 rounded">
                    Fix it
                  </span>
                </button>
              )
            })()}
          </div>
        </div>
      )}

      {/* Debt vs Savings Warning */}
      {hasDebtAndSavings && (
        <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-800">Consider paying off debt first</p>
              <p className="text-xs mt-1 text-amber-700">
                You have {formatCurrency(totalDebtBalance)} in debt but are allocating {formatCurrency(savingsAllocation)} to savings.
                Debt interest usually costs more than savings interest earns.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!savingsCategory) return
              // Move savings allocation to extra debt repayment
              setExtraDebtPayment(prev => prev + savingsAllocation)
              setAllocations(prev => ({
                ...prev,
                [savingsCategory.id]: 0
              }))
            }}
            className="w-full mt-3 flex items-center justify-center gap-2 py-2 px-3 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm font-medium transition-colors"
          >
            Redirect {formatCurrency(savingsAllocation)} to debt repayment
          </button>
        </div>
      )}

      {/* Household contribution breakdown */}
      {isHousehold && memberContributions.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-bloom-600" />
            <h3 className="font-medium text-gray-900">Member Contributions</h3>
          </div>
          <div className="space-y-2">
            {memberContributions.map((member) => {
              const freqLabel = member.contribution_frequency === 'weekly' ? '/week' :
                member.contribution_frequency === 'fortnightly' ? '/fortnight' : '/month'
              const multiplier = member.contribution_frequency === 'weekly' ? 4.33 :
                member.contribution_frequency === 'fortnightly' ? 2.17 : 1
              const monthlyAmount = member.contribution_amount * multiplier

              return (
                <div key={member.user_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-700">
                    {member.user_id === currentUserId ? 'You' : member.display_name || 'Member'}
                  </span>
                  <div className="text-right">
                    <span className="font-medium text-gray-900">{formatCurrency(monthlyAmount)}</span>
                    {member.contribution_frequency !== 'monthly' && (
                      <span className="text-xs text-gray-400 ml-1">
                        ({formatCurrency(member.contribution_amount)}{freqLabel})
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {householdContributions === 0 && (
            <div className="mt-3 p-2 bg-amber-50 rounded-lg text-sm text-amber-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>No contributions set yet. Ask household members to set their contribution amounts.</p>
            </div>
          )}
        </div>
      )}

      {/* Household Contribution - editable */}
      {!isHousehold && householdId && (
        <div className="card bg-gradient-to-br from-bloom-50 to-lavender-50 border border-bloom-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-bloom-100 flex items-center justify-center">
                <Home className="w-4 h-4 text-bloom-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Household Contribution</p>
                <p className="text-xs text-gray-500">Your share of shared expenses</p>
              </div>
            </div>
            {!editingContribution && (
              <button
                onClick={() => setEditingContribution(true)}
                className="text-xs text-bloom-600 hover:text-bloom-700 font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {editingContribution ? (
            <div className="space-y-3 mt-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={contributionAmount || ''}
                      onChange={(e) => setContributionAmount(parseFloat(e.target.value) || 0)}
                      className="input pl-7 py-2"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="w-32">
                  <label className="text-xs text-gray-500 mb-1 block">Frequency</label>
                  <select
                    value={contributionFreq}
                    onChange={(e) => setContributionFreq(e.target.value)}
                    className="input py-2"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setSavingContribution(true)
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user && householdId) {
                      await supabase
                        .from('household_members')
                        .update({
                          contribution_amount: contributionAmount,
                          contribution_frequency: contributionFreq,
                        })
                        .eq('user_id', user.id)
                        .eq('household_id', householdId)
                    }
                    setSavingContribution(false)
                    setEditingContribution(false)
                    router.refresh()
                  }}
                  disabled={savingContribution}
                  className="flex-1 btn-primary py-2 text-sm"
                >
                  {savingContribution ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setContributionAmount(userContribution)
                    setContributionFreq(userContributionFrequency)
                    setEditingContribution(false)
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-2 p-3 bg-white/50 rounded-lg">
              <div>
                <p className="text-2xl font-bold text-bloom-600">
                  {formatCurrency(userMonthlyContribution)}
                  <span className="text-sm font-normal text-gray-500">/month</span>
                </p>
                {userContributionFrequency !== 'monthly' && userContribution > 0 && (
                  <p className="text-xs text-gray-500">
                    ({formatCurrency(userContribution)} {userContributionFrequency === 'weekly' ? 'weekly' : 'fortnightly'})
                  </p>
                )}
              </div>
              {userMonthlyContribution > 0 && (
                <div className="flex items-center gap-1 text-xs text-sprout-600">
                  <Check className="w-3 h-3" />
                  <span>Included in budget</span>
                </div>
              )}
            </div>
          )}

          {userMonthlyContribution === 0 && !editingContribution && (
            <p className="text-xs text-amber-600 mt-2">
              Set your contribution to track household expenses in your budget.
            </p>
          )}

          {/* Link to household budget */}
          <Link
            href="/budget?scope=household"
            className="mt-4 flex items-center justify-center gap-2 py-2.5 px-4 bg-bloom-600 hover:bg-bloom-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Users className="w-4 h-4" />
            View Household Budget
          </Link>
        </div>
      )}

      {/* Sinking Funds - Monthly savings for quarterly/yearly bills */}
      {infrequentBills.length > 0 && (
        <div className="card bg-gradient-to-br from-lavender-50 to-bloom-50 border border-lavender-100">
          <button
            onClick={() => setSinkingFundsExpanded(!sinkingFundsExpanded)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-lavender-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-lavender-600" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">Sinking Funds</p>
                  <span className="text-xs text-gray-400">({infrequentBills.length})</span>
                  {sinkingFundsExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-500">Auto-allocated for yearly/quarterly bills</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-lavender-600">{formatCurrency(monthlySinkingFunds)}</p>
                <p className="text-xs text-gray-400">/month</p>
              </div>
            </button>

            {sinkingFundsExpanded && (
              <>
                <div className="space-y-2 mt-3 pt-3 border-t border-lavender-100">
                  {infrequentBills.map((bill) => {
                    const divisor = bill.frequency === 'yearly' ? 12 : 3
                    const monthlyAmount = Number(bill.amount) / divisor
                    const dueDate = new Date(bill.next_due)
                    const savedAmount = Number(bill.saved_amount) || 0
                    const progress = (savedAmount / Number(bill.amount)) * 100
                    const remaining = Math.max(0, Number(bill.amount) - savedAmount)

                    // Calculate time until due
                    const today = new Date()
                    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    const monthsUntil = Math.ceil(daysUntil / 30)
                    const isUrgent = daysUntil <= 30
                    const isSoon = daysUntil <= 60

                    return (
                      <div
                        key={bill.id}
                        className={`p-3 rounded-lg border-l-4 ${
                          isUrgent ? 'bg-red-50 border-red-400' :
                          isSoon ? 'bg-amber-50 border-amber-400' :
                          'bg-white/60 border-lavender-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Link href={`/bills/${bill.id}`} className="flex-1 hover:text-bloom-600">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">{bill.name}</p>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                isUrgent ? 'bg-red-100 text-red-700' :
                                isSoon ? 'bg-amber-100 text-amber-700' :
                                'bg-lavender-100 text-lavender-700'
                              }`}>
                                {daysUntil <= 0 ? 'Overdue' :
                                 daysUntil === 1 ? 'Tomorrow' :
                                 daysUntil < 30 ? `${daysUntil}d` :
                                 monthsUntil === 1 ? '1 month' :
                                 `${monthsUntil} months`}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {formatCurrency(bill.amount)}/{bill.frequency === 'yearly' ? 'year' : 'quarter'}
                              {' • '}{format(dueDate, 'MMM d, yyyy')}
                            </p>
                          </Link>
                          <div className="text-right">
                            <p className="text-sm font-bold text-lavender-600">{formatCurrency(monthlyAmount)}</p>
                            <p className="text-xs text-gray-400">/month</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-sprout-600">{formatCurrency(savedAmount)} saved</span>
                            <div className="flex items-center gap-2">
                              {savedAmount > 0 && (
                                <button
                                  onClick={async () => {
                                    await supabase
                                      .from('bills')
                                      .update({ saved_amount: 0 })
                                      .eq('id', bill.id)
                                    router.refresh()
                                  }}
                                  className="text-gray-400 hover:text-red-500 text-xs"
                                  title="Reset saved amount"
                                >
                                  Reset
                                </button>
                              )}
                              <span className="text-gray-400">{formatCurrency(remaining)} to go</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-lavender-400 to-bloom-400 rounded-full transition-all"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>

                          {/* Contribution UI */}
                          {savedAmount >= Number(bill.amount) ? (
                            <div className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium bg-sprout-100 text-sprout-600">
                              <Check className="w-3.5 h-3.5" />
                              Fully funded
                            </div>
                          ) : (
                            <button
                              onClick={async () => {
                                const newSavedAmount = Math.min(savedAmount + monthlyAmount, Number(bill.amount))
                                await supabase
                                  .from('bills')
                                  .update({ saved_amount: newSavedAmount })
                                  .eq('id', bill.id)
                                router.refresh()
                              }}
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium bg-lavender-100 text-lavender-700 hover:bg-lavender-200 transition-colors"
                            >
                              + Add {formatCurrency(monthlyAmount)} this month
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-lavender-100">
                  Click to mark funds as reserved from your category budget. Resets when bill is paid.
                </p>
              </>
            )}
          </div>
      )}

      {/* Category Allocations (discretionary spending) */}
      <div className="space-y-3">
        {budgetCategories.map((category) => {
          const allocated = allocations[category.id] || 0
          const spent = spentByCategory[category.id] || 0
          const memberBreakdown = isHousehold ? getMemberBreakdown(category.id) : []
          const isExpanded = expandedCategory === category.id
          const categoryBills = bills.filter(b => b.category_id === category.id && b.is_active)
          const categoryTransactions = transactionsByCategory[category.id] || []

          // Calculate sinking fund reserved amount for this category
          const categorySinkingFunds = categoryBills
            .filter(b => !b.is_one_off && (b.frequency === 'quarterly' || b.frequency === 'yearly'))
            .reduce((sum, b) => sum + (Number(b.saved_amount) || 0), 0)

          const totalUsed = spent + categorySinkingFunds
          const remaining = allocated - totalUsed
          const progress = allocated > 0 ? (totalUsed / allocated) * 100 : 0
          const isOver = remaining < 0

          const isRentMortgage = category.name.toLowerCase().includes('rent') ||
            category.name.toLowerCase().includes('mortgage') ||
            category.name.toLowerCase().includes('housing')
          const rentBill = isRentMortgage ? categoryBills[0] : null
          const hasExpandableContent = !isRentMortgage && (categoryTransactions.length > 0 || categoryBills.length > 0 || (isHousehold && memberBreakdown.length > 0))

          // For rent/mortgage, calculate days until due or if paid
          let rentStatus = null
          if (rentBill) {
            const daysUntil = differenceInDays(new Date(rentBill.next_due), new Date())
            const isPaidThisMonth = spent >= Number(rentBill.amount) * 0.9 // Consider paid if within 90%
            if (isPaidThisMonth) {
              rentStatus = { text: 'Paid', color: 'text-sprout-600' }
            } else if (daysUntil < 0) {
              rentStatus = { text: `${Math.abs(daysUntil)}d overdue`, color: 'text-red-500' }
            } else if (daysUntil === 0) {
              rentStatus = { text: 'Due today', color: 'text-amber-500' }
            } else {
              rentStatus = { text: `Due in ${daysUntil}d`, color: 'text-gray-500' }
            }
          }

          return (
            <div key={category.id} className="card">
              <div className="flex items-center gap-3 mb-3">
                <CategoryChip
                  name={category.name}
                  color={category.color}
                  icon={category.icon}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{category.name}</p>
                    {rentStatus && (
                      <span className={`text-xs font-medium ${rentStatus.color}`}>
                        {rentStatus.text}
                      </span>
                    )}
                    {!isRentMortgage && categoryBills.length > 0 && (
                      <span className="text-xs text-gray-400">
                        ({categoryBills.length} bill{categoryBills.length !== 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-400">
                      {formatCurrency(spent)} spent
                      {categorySinkingFunds > 0 && (
                        <span className="text-lavender-500"> + {formatCurrency(categorySinkingFunds)} reserved</span>
                      )}
                      {allocated > 0 && ` of ${formatCurrency(allocated)}`}
                    </p>
                    {hasExpandableContent && (
                      <button
                        onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                        className="flex items-center gap-1 text-xs text-bloom-600 hover:text-bloom-700"
                      >
                        {isExpanded ? (
                          <>Hide <ChevronUp className="w-3 h-3" /></>
                        ) : (
                          <>Show <ChevronDown className="w-3 h-3" /></>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div className="w-24">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={allocated || ''}
                      onChange={(e) => handleAllocationChange(category.id, e.target.value)}
                      placeholder="0"
                      className="input pl-7 py-2 text-right text-sm font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Expanded section */}
              {isExpanded && !isRentMortgage && (
                <div className="mb-3 space-y-2">
                  {/* Recent transactions */}
                  {categoryTransactions.length > 0 && (
                    <div className="space-y-1">
                      {categoryTransactions.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 truncate">{t.description}</p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(t.date), 'd MMM')}
                            </p>
                          </div>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(t.amount)}
                          </span>
                        </div>
                      ))}
                      {spent > 0 && (
                        <Link
                          href={`/transactions?category=${category.id}`}
                          className="block text-center text-xs text-bloom-600 hover:text-bloom-700 py-1"
                        >
                          View all transactions →
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Member breakdown - household view */}
                  {isHousehold && memberBreakdown.length > 0 && (
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <MemberBreakdownInline breakdown={memberBreakdown} />
                    </div>
                  )}
                </div>
              )}

              {/* Bills/Subscriptions list - expandable */}
              {isExpanded && categoryBills.length > 0 && (
                <div className="mb-3 space-y-2">
                  {categoryBills.map((bill) => {
                    const today = new Date()
                    const storedDue = new Date(bill.next_due)
                    const daysUntilStored = differenceInDays(storedDue, today)

                    // Expected days for each frequency
                    const frequencyDays: Record<string, number> = {
                      weekly: 7,
                      fortnightly: 14,
                      monthly: 31,
                      quarterly: 92,
                      yearly: 365,
                    }
                    const expectedDays = frequencyDays[bill.frequency] || 31

                    // Use stored date if reasonable, otherwise show expected
                    const daysUntil = daysUntilStored <= expectedDays + 3 ? daysUntilStored : expectedDays
                    const isOverdue = daysUntil < 0
                    const isDueSoon = daysUntil >= 0 && daysUntil <= 7

                    // Calculate sinking fund progress for quarterly/yearly bills
                    const isInfrequent = bill.frequency === 'quarterly' || bill.frequency === 'yearly'
                    const totalMonths = bill.frequency === 'yearly' ? 12 : bill.frequency === 'quarterly' ? 3 : 1
                    const monthlyAmount = Number(bill.amount) / totalMonths
                    // Use actual saved amount from database, not calculated from time
                    const actualSaved = Number(bill.saved_amount) || 0
                    const saveProgress = totalMonths > 1 ? (actualSaved / Number(bill.amount)) * 100 : 0

                    return (
                      <div
                        key={bill.id}
                        className={`p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group ${isInfrequent ? 'pb-3' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/bills/${bill.id}`}
                            className="flex-1 min-w-0"
                          >
                            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-bloom-600">{bill.name}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span className={isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : ''}>
                                {isOverdue
                                  ? `${Math.abs(daysUntil)} days overdue`
                                  : daysUntil === 0
                                  ? 'Due today'
                                  : `Due in ${daysUntil} days`}
                              </span>
                            </div>
                          </Link>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className="text-sm font-medium text-gray-900">
                                {formatCurrency(bill.amount)}
                                <span className="text-xs text-gray-400">
                                  /{bill.frequency === 'yearly' ? 'yr' : bill.frequency === 'quarterly' ? 'qtr' : bill.frequency === 'fortnightly' ? '2wk' : bill.frequency === 'weekly' ? 'wk' : 'mo'}
                                </span>
                              </span>
                              {isInfrequent && (
                                <p className="text-xs text-gray-400">
                                  {formatCurrency(monthlyAmount)}/mo to save
                                </p>
                              )}
                            </div>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                let nextDue: Date
                                switch (bill.frequency) {
                                  case 'weekly':
                                    nextDue = addWeeks(today, 1)
                                    break
                                  case 'fortnightly':
                                    nextDue = addWeeks(today, 2)
                                    break
                                  case 'quarterly':
                                    nextDue = addMonths(today, 3)
                                    break
                                  case 'yearly':
                                    nextDue = addMonths(today, 12)
                                    break
                                  default:
                                    nextDue = addMonths(today, 1)
                                }
                                await supabase
                                  .from('bills')
                                  .update({ next_due: format(nextDue, 'yyyy-MM-dd'), saved_amount: 0 })
                                  .eq('id', bill.id)
                                router.refresh()
                              }}
                              className="p-1.5 text-sprout-600 hover:bg-sprout-50 rounded transition-colors"
                              title="Mark as paid"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (confirm(`Remove "${bill.name}" from your bills?`)) {
                                  await supabase.from('bills').delete().eq('id', bill.id)
                                  router.refresh()
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                              title="Remove bill"
                            >
                              <span className="text-xs">✕</span>
                            </button>
                          </div>
                        </div>

                        {/* Sinking fund progress for quarterly/yearly bills */}
                        {isInfrequent && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-sprout-600 font-medium">
                                {formatCurrency(actualSaved)} saved
                              </span>
                              <span className="text-gray-400">
                                of {formatCurrency(bill.amount)}
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-sprout-500 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(saveProgress, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <Link
                    href="/bills/new"
                    className="flex items-center justify-center gap-1 p-2 text-sm text-bloom-600 hover:text-bloom-700 hover:bg-bloom-50 rounded-lg transition-colors"
                  >
                    + Add subscription
                  </Link>
                </div>
              )}

              {/* Progress bar */}
              {allocated > 0 && (
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOver ? 'bg-red-500' : progress > 80 ? 'bg-amber-500' : 'bg-sprout-500'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Debt Repayments Section */}
      {debtAccounts.length > 0 && (monthlyDebtPayments > 0 || extraDebtPayment > 0) && (
        <div className="card bg-gradient-to-br from-amber-50 to-orange-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Debt Repayments</p>
                <p className="text-xs text-gray-500">
                  {extraDebtPayment > 0 ? 'Minimum + extra payments' : 'Monthly minimum payments'}
                </p>
              </div>
            </div>
            <p className="text-lg font-bold text-amber-600">{formatCurrency(monthlyDebtPayments + extraDebtPayment)}</p>
          </div>
          <div className="space-y-2">
            {debtAccounts.map((account) => {
              if (!account.minimum_payment) return null
              const frequency = account.payment_frequency || 'monthly'
              const multiplier = frequencyToMonthly[frequency] || 1
              const monthlyAmount = Number(account.minimum_payment) * multiplier
              const freqLabel = frequency === 'weekly' ? '/wk' :
                frequency === 'fortnightly' ? '/2wk' : '/mo'

              return (
                <div key={account.id} className="flex items-center justify-between py-2 px-3 bg-white/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{account.name}</p>
                    <p className="text-xs text-gray-500">Balance: {formatCurrency(account.balance)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(monthlyAmount)}</p>
                    {frequency !== 'monthly' && (
                      <p className="text-xs text-gray-400">
                        ({formatCurrency(account.minimum_payment)}{freqLabel})
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {extraDebtPayment > 0 && (
            <div className="flex items-center justify-between py-2 px-3 bg-sprout-50 rounded-lg mt-2">
              <div>
                <p className="text-sm font-medium text-sprout-700">Extra debt payment</p>
                <p className="text-xs text-sprout-600">Redirected from savings</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-sprout-700">+{formatCurrency(extraDebtPayment)}</p>
                <button
                  onClick={() => setExtraDebtPayment(0)}
                  className="text-xs text-gray-400 hover:text-red-500"
                  title="Remove extra payment"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          <Link
            href="/debt-planner"
            className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-amber-200/50 text-sm text-amber-700 hover:text-amber-800 font-medium"
          >
            View Debt Planner →
          </Link>
        </div>
      )}

      {/* Savings Goals / Buckets - always show */}
      <div className="card bg-gradient-to-br from-sprout-50 to-bloom-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sprout-100 flex items-center justify-center">
              <Target className="w-4 h-4 text-sprout-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Savings Goals</p>
              <p className="text-xs text-gray-500">Long-term saving buckets (gifts, vacation, etc.)</p>
            </div>
          </div>
          <Link
            href="/goals/new"
            className="text-xs text-sprout-600 hover:text-sprout-700 font-medium"
          >
            + Add
          </Link>
        </div>

        {savingsGoals.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-2">No savings goals yet</p>
            <Link
              href="/goals/new"
              className="text-sm font-medium text-sprout-600 hover:text-sprout-700"
            >
              + Create your first goal
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {savingsGoals.map((goal) => {
                const progress = goal.target_amount > 0
                  ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100
                  : 0
                const remaining = Number(goal.target_amount) - Number(goal.current_amount)

                // Get icon based on goal type or name
                const getGoalIcon = () => {
                  const name = goal.name.toLowerCase()
                  if (name.includes('gift')) return <Gift className="w-4 h-4" />
                  if (name.includes('vacation') || name.includes('travel') || name.includes('holiday')) return <Plane className="w-4 h-4" />
                  return <Sparkles className="w-4 h-4" />
                }

                return (
                  <Link
                    key={goal.id}
                    href={`/goals/${goal.id}`}
                    className="block p-3 bg-white/50 hover:bg-white/80 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: goal.color ? `${goal.color}20` : '#e0f2fe', color: goal.color || '#0ea5e9' }}
                        >
                          {getGoalIcon()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{goal.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatCurrency(remaining)} to go
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(progress, 100)}%`,
                          backgroundColor: goal.color || '#10b981'
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>{formatCurrency(goal.current_amount)}</span>
                      <span>{formatCurrency(goal.target_amount)}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
            <Link
              href="/goals"
              className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-sprout-200/50 text-sm text-sprout-700 hover:text-sprout-800 font-medium"
            >
              View All Goals →
            </Link>
          </>
        )}
      </div>

      {/* Over-allocation Warning with Smart Suggestions */}
      {unallocated < 0 && (
        <div className="card bg-red-50 border border-red-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-red-700">Over-allocated by {formatCurrency(Math.abs(unallocated))}</p>
              <p className="text-xs mt-1 text-red-600">
                Your budget exceeds your income. Here are some options to balance it:
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {/* Option 1: Take from Savings */}
            {(() => {
              const savingsCategory = budgetCategories.find(c =>
                c.name.toLowerCase().includes('saving') ||
                c.name.toLowerCase().includes('emergency')
              )
              const savingsAllocation = savingsCategory ? (allocations[savingsCategory.id] || 0) : 0
              const overAmount = Math.abs(unallocated)

              if (!savingsCategory || savingsAllocation <= 0) return null

              const canFullyFix = savingsAllocation >= overAmount
              const reductionAmount = Math.min(savingsAllocation, overAmount)

              return (
                <button
                  onClick={() => {
                    setAllocations(prev => ({
                      ...prev,
                      [savingsCategory.id]: Math.max(0, savingsAllocation - overAmount)
                    }))
                  }}
                  className="w-full flex items-center justify-between p-3 bg-white hover:bg-red-50 border border-red-200 rounded-lg transition-colors group"
                >
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-red-700">
                      Take from {savingsCategory.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Reduce savings by {formatCurrency(reductionAmount)}
                      {!canFullyFix && ` (${formatCurrency(overAmount - reductionAmount)} still over)`}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                    {canFullyFix ? 'Fix it' : `−${formatCurrency(reductionAmount)}`}
                  </span>
                </button>
              )
            })()}

            {/* Option 2: Show categories trending under budget */}
            {(() => {
              const savingsCategory = budgetCategories.find(c =>
                c.name.toLowerCase().includes('saving') ||
                c.name.toLowerCase().includes('emergency')
              )

              // Calculate day of month to estimate monthly pace
              const dayOfMonth = new Date().getDate()
              const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
              const monthProgress = dayOfMonth / daysInMonth

              const sortedCategories = budgetCategories
                .filter(c => (allocations[c.id] || 0) > 0)
                .filter(c => !savingsCategory || c.id !== savingsCategory.id) // Exclude savings
                .filter(c => { // Exclude fixed expenses like rent/mortgage
                  const name = c.name.toLowerCase()
                  return !name.includes('rent') && !name.includes('mortgage') && !name.includes('housing')
                })
                .map(c => {
                  const allocated = allocations[c.id] || 0
                  const spent = spentByCategory[c.id] || 0
                  const expectedSpent = allocated * monthProgress
                  const excess = allocated - spent
                  // Score by how much under the expected pace
                  const underPace = expectedSpent - spent
                  return {
                    ...c,
                    allocated,
                    spent,
                    excess,
                    underPace,
                    percentUsed: allocated > 0 ? Math.round((spent / allocated) * 100) : 0
                  }
                })
                .filter(c => c.excess > 0 && c.underPace > 0) // Only show categories trending under
                .sort((a, b) => b.underPace - a.underPace) // Sort by most under pace
                .slice(0, 3)

              if (sortedCategories.length === 0) return null

              return (
                <div className="p-3 bg-white border border-red-200 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Categories trending under budget this month:
                  </p>
                  <div className="space-y-1.5">
                    {sortedCategories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-sm text-gray-700">{cat.name}</span>
                          <span className="text-xs text-gray-400">
                            ({cat.percentUsed}% used, {formatCurrency(cat.excess)} left)
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            const reduction = Math.min(cat.excess, Math.abs(unallocated))
                            setAllocations(prev => ({
                              ...prev,
                              [cat.id]: Math.max(cat.spent, (prev[cat.id] || 0) - reduction)
                            }))
                          }}
                          className="text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded"
                        >
                          −{formatCurrency(Math.min(cat.excess, Math.abs(unallocated)))}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Save Button */}
      {saveSuccess && (
        <div className="p-3 bg-sprout-50 text-sprout-700 rounded-xl text-sm text-center font-medium">
          Budget saved successfully!
        </div>
      )}
      <button
        onClick={() => handleSave()}
        disabled={saving}
        className="btn-primary w-full"
      >
        {saving ? 'Saving...' : unallocated < 0 ? 'Save Anyway' : 'Save Budget'}
      </button>
    </div>
  )
}
