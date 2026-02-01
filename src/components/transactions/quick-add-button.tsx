'use client'

import { useState } from 'react'
import { Plus, X, CreditCard, RefreshCw, Calendar, Sparkles } from 'lucide-react'
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
  creditCards?: Tables<'accounts'>[]
}

type TransactionType = 'expense' | 'income'
type Frequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'

// Quick-select presets for income
const INCOME_PRESETS = [
  { name: 'Bonus', icon: 'gift' },
  { name: 'Gift', icon: 'heart' },
  { name: 'Refund', icon: 'rotate-ccw' },
  { name: 'Tax Return', icon: 'landmark' },
  { name: 'Side Hustle', icon: 'briefcase' },
]

// Common recurring expenses with typical amounts
const RECURRING_SUGGESTIONS = [
  { name: 'Netflix', amount: 23, category: 'Subscriptions' },
  { name: 'Spotify', amount: 13, category: 'Subscriptions' },
  { name: 'Gym', amount: 60, category: 'Health' },
  { name: 'Phone', amount: 65, category: 'Utilities' },
  { name: 'Internet', amount: 80, category: 'Utilities' },
  { name: 'Electricity', amount: 150, category: 'Utilities' },
  { name: 'Insurance', amount: 100, category: 'Insurance' },
]

export function QuickAddButton({ expenseCategories, incomeCategories, creditCards = [] }: QuickAddButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<TransactionType>('expense')
  const [selectedCategory, setSelectedCategory] = useState<Tables<'categories'> | null>(null)
  const [incomePreset, setIncomePreset] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Recurring transaction fields
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [showRecurringSuggestions, setShowRecurringSuggestions] = useState(false)
  const [billCreated, setBillCreated] = useState(false)

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
    setSelectedCardId(null)
    setIsRecurring(false)
    setFrequency('monthly')
    setShowRecurringSuggestions(false)
    setBillCreated(false)
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
    setIsRecurring(false)
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

  function handleRecurringSuggestion(suggestion: typeof RECURRING_SUGGESTIONS[0]) {
    setDescription(suggestion.name)
    setAmount(suggestion.amount.toString())
    setIsRecurring(true)
    setShowRecurringSuggestions(false)

    // Try to find matching category
    const matchingCat = expenseCategories.find(
      c => c.name.toLowerCase().includes(suggestion.category.toLowerCase())
    )
    if (matchingCat) {
      setSelectedCategory(matchingCat)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const hasValidSelection = isExpense
      ? selectedCategory
      : (selectedCategory || incomePreset)

    if (!hasValidSelection || !amount) return

    setLoading(true)

    const categoryId = selectedCategory?.id || incomeCategories[0]?.id
    if (!categoryId) {
      setLoading(false)
      return
    }

    const user = (await supabase.auth.getUser()).data.user!

    // Create the transaction
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      category_id: categoryId,
      amount: parseFloat(amount),
      type: transactionType,
      description: description || selectedCategory?.name || incomePreset || 'Income',
      date: date,
      account_id: isExpense && selectedCardId ? selectedCardId : null,
      is_recurring: isRecurring,
    })

    // If expense was added to a credit card, update the card balance
    if (!error && isExpense && selectedCardId) {
      const card = creditCards.find(c => c.id === selectedCardId)
      if (card) {
        await supabase
          .from('accounts')
          .update({
            balance: card.balance + parseFloat(amount),
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedCardId)
      }
    }

    // If recurring, create a bill automatically
    if (!error && isRecurring && isExpense && description) {
      const dueDay = new Date(date).getDate()
      const nextDue = new Date()
      nextDue.setDate(dueDay)
      if (nextDue <= new Date()) {
        nextDue.setMonth(nextDue.getMonth() + 1)
      }

      const { error: billError } = await supabase.from('bills').insert({
        user_id: user.id,
        category_id: categoryId,
        name: description,
        amount: parseFloat(amount),
        frequency: frequency,
        due_day: dueDay,
        next_due: nextDue.toISOString().split('T')[0],
        is_active: true,
      })

      if (!billError) {
        setBillCreated(true)
      }
    }

    if (!error) {
      // Show brief success then close
      setTimeout(() => {
        handleClose()
        window.location.reload()
      }, billCreated ? 1500 : 300)
    }

    setLoading(false)
  }

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
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 pb-24 animate-slide-up max-h-[85vh] overflow-y-auto">
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

        {/* Bill Created Success */}
        {billCreated && (
          <div className="mb-4 p-3 bg-sprout-50 rounded-xl flex items-center gap-2 text-sprout-700">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">Bill created! It'll appear in upcoming bills.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Quick Recurring Suggestions - for expenses only */}
          {isExpense && !selectedCategory && !amount && (
            <div>
              <button
                type="button"
                onClick={() => setShowRecurringSuggestions(!showRecurringSuggestions)}
                className="flex items-center gap-2 text-sm text-bloom-600 hover:text-bloom-700 mb-2"
              >
                <Sparkles className="w-4 h-4" />
                Quick add common bills
              </button>

              {showRecurringSuggestions && (
                <div className="flex flex-wrap gap-2 mb-4 p-3 bg-bloom-50 rounded-xl">
                  {RECURRING_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion.name}
                      type="button"
                      onClick={() => handleRecurringSuggestion(suggestion)}
                      className="px-3 py-1.5 bg-white rounded-lg text-sm text-gray-700 hover:bg-bloom-100 transition-colors shadow-sm"
                    >
                      {suggestion.name} (${suggestion.amount})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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

          {/* Recurring Toggle - for expenses only */}
          {isExpense && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 ${isRecurring ? 'text-bloom-600' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium text-gray-700">This is a recurring bill</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    isRecurring ? 'bg-bloom-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isRecurring ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {isRecurring && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <label className="text-xs text-gray-500 mb-2 block">How often?</label>
                  <div className="flex flex-wrap gap-2">
                    {(['weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly'] as Frequency[]).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFrequency(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          frequency === f
                            ? 'bg-bloom-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-bloom-50'
                        }`}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-bloom-600 mt-2">
                    We'll automatically add this to your upcoming bills
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Credit Card Selection - for expenses only */}
          {isExpense && creditCards.length > 0 && (
            <div>
              <label className="label">Pay With (optional)</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCardId(null)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                    selectedCardId === null
                      ? 'bg-gray-200 text-gray-800'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-150'
                  }`}
                >
                  Cash/Debit
                </button>
                {creditCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedCardId(card.id)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                      selectedCardId === card.id
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-500 hover:bg-purple-50'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {card.name}
                  </button>
                ))}
              </div>
              {selectedCardId && (
                <p className="text-xs text-purple-600 mt-1.5">
                  This expense will be added to your credit card balance
                </p>
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
            <label className="label">
              Description {isRecurring ? '' : '(optional)'}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isRecurring ? 'e.g., Netflix, Gym membership' : isExpense ? 'What was this for?' : 'e.g., Tax refund from ATO'}
              className="input"
              required={isRecurring}
            />
            {isRecurring && !description && (
              <p className="text-xs text-amber-600 mt-1">Required for creating a bill</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !isFormValid || (isRecurring && !description)}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isExpense
                ? 'bg-gradient-to-r from-bloom-500 to-bloom-600 text-white shadow-lg shadow-bloom-500/30 hover:shadow-bloom-500/40'
                : 'bg-gradient-to-r from-sprout-500 to-sprout-600 text-white shadow-lg shadow-sprout-500/30 hover:shadow-sprout-500/40'
            }`}
          >
            {loading ? 'Saving...' : isRecurring ? 'Save & Create Bill' : 'Save'}
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
