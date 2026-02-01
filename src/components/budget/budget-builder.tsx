'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Wand2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CategoryChip } from '@/components/ui/category-chip'
import { IncomeEditor } from '@/components/budget/income-editor'
import { BudgetWizard } from '@/components/budget/budget-wizard'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/database.types'

interface BudgetBuilderProps {
  categories: Tables<'categories'>[]
  budgets: Tables<'budgets'>[]
  incomeEntries: Tables<'income_entries'>[]
  spentByCategory: Record<string, number>
  currentMonth: string
}

export function BudgetBuilder({
  categories,
  budgets,
  incomeEntries,
  spentByCategory,
  currentMonth,
}: BudgetBuilderProps) {
  const router = useRouter()
  const totalIncome = incomeEntries.reduce((sum, e) => sum + Number(e.amount), 0)
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

  const supabase = createClient()

  const totalAllocated = Object.values(allocations).reduce((sum, a) => sum + a, 0)
  const unallocated = totalIncome - totalAllocated
  const isBalanced = Math.abs(unallocated) < 0.01

  function handleReset() {
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

  const [saveSuccess, setSaveSuccess] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaveSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    // Delete existing budgets for this month, then insert new ones
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

    const inserts = Object.entries(allocations)
      .filter(([_, allocated]) => allocated > 0)
      .map(([categoryId, allocated]) => ({
        user_id: user.id,
        household_id: null,
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
    // Hide success message after 2 seconds
    setTimeout(() => setSaveSuccess(false), 2000)
    router.refresh()
  }

  function handleAllocationChange(categoryId: string, value: string) {
    const num = parseFloat(value) || 0
    setAllocations(prev => ({ ...prev, [categoryId]: num }))
  }

  return (
    <div className="space-y-4">
      {/* Income & Unallocated Header */}
      <div className="card bg-gradient-to-br from-sprout-50 to-bloom-50">
        <div className="flex items-center justify-between mb-4">
          <IncomeEditor
            incomeEntries={incomeEntries}
            currentMonth={currentMonth}
            onUpdate={() => router.refresh()}
          />
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

      {/* Category Allocations */}
      <div className="space-y-3">
        {categories.map((category) => {
          const allocated = allocations[category.id] || 0
          const spent = spentByCategory[category.id] || 0
          const remaining = allocated - spent
          const progress = allocated > 0 ? (spent / allocated) * 100 : 0
          const isOver = remaining < 0

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
                  <p className="text-xs text-gray-400">
                    {formatCurrency(spent)} spent
                    {allocated > 0 && ` of ${formatCurrency(allocated)}`}
                  </p>
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
        {saving ? 'Saving...' : 'Save Budget'}
      </button>
    </div>
  )
}
