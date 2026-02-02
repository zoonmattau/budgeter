'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Wand2, Info, Wallet, Users, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CategoryChip } from '@/components/ui/category-chip'
import { IncomeEditor } from '@/components/budget/income-editor'
import { BudgetWizard } from '@/components/budget/budget-wizard'
import { MemberBreakdownInline } from '@/components/ui/member-breakdown'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/database.types'
import type { ViewScope, HouseholdMember } from '@/lib/scope-context'
import type { MemberSpending } from '@/components/ui/member-breakdown'

interface MemberContribution {
  user_id: string
  display_name: string | null
  contribution_amount: number
  contribution_frequency: string
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
}: BudgetBuilderProps) {
  const router = useRouter()
  const isHousehold = scope === 'household'

  // In household view: use combined contributions as income
  // In personal view: use income entries
  const personalIncome = incomeEntries.reduce((sum, e) => sum + Number(e.amount), 0)
  const totalIncome = isHousehold ? householdContributions : personalIncome
  const hasNoBudget = budgets.length === 0

  // Show wizard for first-time users
  const [showWizard, setShowWizard] = useState(hasNoBudget && totalIncome > 0 && categories.length > 0)

  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    budgets.forEach(b => {
      initial[b.category_id] = Number(b.allocated)
    })
    return initial
  })
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const supabase = createClient()

  const totalAllocated = Object.values(allocations).reduce((sum, a) => sum + a, 0)
  const unallocated = totalIncome - totalAllocated
  const isBalanced = Math.abs(unallocated) < 0.01

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

  async function handleSave() {
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

    const inserts = Object.entries(allocations)
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
            style={{ width: `${Math.min((totalAllocated / totalIncome) * 100, 100)}%` }}
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

      {/* Personal budget notice about household contribution */}
      {!isHousehold && userMonthlyContribution > 0 && (
        <div className="p-3 bg-bloom-50 border border-bloom-100 rounded-xl text-sm text-bloom-700 flex items-start gap-2">
          <Wallet className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Household contribution: {formatCurrency(userMonthlyContribution)}/month</p>
            <p className="text-bloom-600 text-xs mt-1">
              Remember to account for this in your personal budget - it&apos;s money that goes to your shared household expenses.
            </p>
          </div>
        </div>
      )}

      {/* Category Allocations */}
      <div className="space-y-3">
        {categories.map((category) => {
          const allocated = allocations[category.id] || 0
          const spent = spentByCategory[category.id] || 0
          const remaining = allocated - spent
          const progress = allocated > 0 ? (spent / allocated) * 100 : 0
          const isOver = remaining < 0
          const memberBreakdown = isHousehold ? getMemberBreakdown(category.id) : []
          const isExpanded = expandedCategory === category.id

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
                  <p className="font-medium text-gray-900">{category.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-400">
                      {formatCurrency(spent)} spent
                      {allocated > 0 && ` of ${formatCurrency(allocated)}`}
                    </p>
                    {isHousehold && memberBreakdown.length > 0 && (
                      <button
                        onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                        className="text-xs text-bloom-600 hover:text-bloom-700 underline"
                      >
                        {isExpanded ? 'Hide' : 'By member'}
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

              {/* Member breakdown - expandable in household view */}
              {isHousehold && isExpanded && memberBreakdown.length > 0 && (
                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                  <MemberBreakdownInline breakdown={memberBreakdown} />
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

      {/* Over-allocation Warning */}
      {unallocated < 0 && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          <p className="font-medium">Over-allocated by {formatCurrency(Math.abs(unallocated))}</p>
          <p className="text-xs mt-1 text-red-600">
            Your budget exceeds your income. Consider reducing some allocations to avoid overspending.
          </p>
        </div>
      )}

      {/* Save Button */}
      {saveSuccess && (
        <div className="p-3 bg-sprout-50 text-sprout-700 rounded-xl text-sm text-center font-medium">
          Budget saved successfully!
        </div>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full"
      >
        {saving ? 'Saving...' : unallocated < 0 ? 'Save Anyway' : 'Save Budget'}
      </button>
    </div>
  )
}
