'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { CategoryChip } from '@/components/ui/category-chip'
import { CurrencyInput } from '@/components/ui/currency-input'
import { DatePicker } from '@/components/ui/date-picker'
import { TogglePills } from '@/components/ui/toggle-pills'
import type { Tables } from '@/lib/database.types'

interface QuickAddButtonProps {
  expenseCategories: Tables<'categories'>[]
  incomeCategories: Tables<'categories'>[]
}

type TransactionType = 'expense' | 'income'

// Quick-select presets for income
const INCOME_PRESETS = [
  { name: 'Bonus', icon: 'gift' },
  { name: 'Gift', icon: 'heart' },
  { name: 'Refund', icon: 'rotate-ccw' },
  { name: 'Tax Return', icon: 'landmark' },
  { name: 'Side Hustle', icon: 'briefcase' },
]

export function QuickAddButton({ expenseCategories, incomeCategories }: QuickAddButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<TransactionType>('expense')
  const [selectedCategory, setSelectedCategory] = useState<Tables<'categories'> | null>(null)
  const [incomePreset, setIncomePreset] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const categories = transactionType === 'expense' ? expenseCategories : incomeCategories
  const isExpense = transactionType === 'expense'

  function resetForm() {
    setSelectedCategory(null)
    setIncomePreset(null)
    setAmount('')
    setDescription('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setTransactionType('expense')
  }

  function handleOpen() {
    resetForm()
    setIsOpen(true)
  }

  function handleClose() {
    setIsOpen(false)
    resetForm()
  }

  function handleTypeChange(type: TransactionType) {
    setTransactionType(type)
    setSelectedCategory(null)
    setIncomePreset(null)
  }

  function handleIncomePreset(preset: string) {
    setIncomePreset(preset)
    setSelectedCategory(null)
    setDescription(preset)
  }

  function handleCategorySelect(category: Tables<'categories'>) {
    setSelectedCategory(category)
    setIncomePreset(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // For income, either need a category or preset
    // For expense, need a category
    const hasValidSelection = isExpense
      ? selectedCategory
      : (selectedCategory || incomePreset)

    if (!hasValidSelection || !amount) return

    setLoading(true)

    // Determine category_id - for presets, use first income category
    const categoryId = selectedCategory?.id || incomeCategories[0]?.id
    if (!categoryId) {
      setLoading(false)
      return
    }

    const { error } = await supabase.from('transactions').insert({
      user_id: (await supabase.auth.getUser()).data.user!.id,
      category_id: categoryId,
      amount: parseFloat(amount),
      type: transactionType,
      description: description || selectedCategory?.name || incomePreset || 'Income',
      date: date,
    })

    if (!error) {
      handleClose()
      window.location.reload()
    }

    setLoading(false)
  }

  // Determine if form is valid
  const hasValidSelection = isExpense
    ? selectedCategory
    : (selectedCategory || incomePreset)
  const isFormValid = hasValidSelection && amount

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-bloom-500 to-bloom-600 text-white shadow-lg shadow-bloom-500/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 pb-safe animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`font-display text-xl font-semibold ${isExpense ? 'text-gray-900' : 'text-sprout-700'}`}>
            {isExpense ? 'Add Expense' : 'Add Income'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Type Toggle */}
        <div className="mb-5">
          <TogglePills
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
            ]}
            value={transactionType}
            onChange={handleTypeChange}
            variant="expense-income"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Amount */}
          <div>
            <label className="label">Amount</label>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              placeholder="0"
              autoFocus
              required
            />
          </div>

          {/* Category - for expenses */}
          {isExpense && (
            <div>
              <label className="label">Category</label>
              <div className="grid grid-cols-4 gap-2">
                {categories.slice(0, 8).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      selectedCategory?.id === cat.id
                        ? 'border-bloom-500 bg-bloom-50'
                        : 'border-transparent bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <CategoryChip
                      name={cat.name}
                      color={cat.color}
                      icon={cat.icon}
                      size="sm"
                      showLabel
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Income Source - for income */}
          {!isExpense && (
            <div>
              <label className="label">Source</label>

              {/* Quick presets */}
              <div className="flex flex-wrap gap-2 mb-3">
                {INCOME_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleIncomePreset(preset.name)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      incomePreset === preset.name
                        ? 'bg-sprout-500 text-white shadow-md shadow-sprout-500/30'
                        : 'bg-sprout-50 text-sprout-700 hover:bg-sprout-100'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              {/* Income categories */}
              {incomeCategories.length > 0 && (
                <>
                  <p className="text-xs text-gray-400 mb-2">Or select a category:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {incomeCategories.slice(0, 4).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategorySelect(cat)}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          selectedCategory?.id === cat.id
                            ? 'border-sprout-500 bg-sprout-50'
                            : 'border-transparent bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <CategoryChip
                          name={cat.name}
                          color={cat.color}
                          icon={cat.icon}
                          size="sm"
                          showLabel
                        />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Date */}
          <DatePicker
            label="Date"
            value={date}
            onChange={setDate}
          />

          {/* Description */}
          <div>
            <label className="label">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isExpense ? 'What was this for?' : 'e.g., Tax refund from ATO'}
              className="input"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isExpense
                ? 'bg-gradient-to-r from-bloom-500 to-bloom-600 text-white shadow-lg shadow-bloom-500/30 hover:shadow-bloom-500/40'
                : 'bg-gradient-to-r from-sprout-500 to-sprout-600 text-white shadow-lg shadow-sprout-500/30 hover:shadow-sprout-500/40'
            }`}
          >
            {loading ? 'Adding...' : isExpense ? 'Add Expense' : 'Add Income'}
          </button>
        </form>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
