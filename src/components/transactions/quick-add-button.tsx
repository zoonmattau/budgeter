'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, CreditCard, RefreshCw, Calendar, Sparkles, CheckCircle2, TrendingUp, Landmark } from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { CategoryChip } from '@/components/ui/category-chip'
import { CurrencyInput } from '@/components/ui/currency-input'
import { DatePicker } from '@/components/ui/date-picker'
import type { Tables } from '@/lib/database.types'

interface QuickAddButtonProps {
  expenseCategories: Tables<'categories'>[]
  incomeCategories: Tables<'categories'>[]
  creditCards?: Tables<'accounts'>[]
  investmentAccounts?: Tables<'accounts'>[]
  bankAccounts?: Tables<'accounts'>[]
}

type TransactionType = 'expense' | 'income' | 'subscription' | 'investment'
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

export function QuickAddButton({ expenseCategories, incomeCategories, creditCards = [], investmentAccounts = [], bankAccounts = [] }: QuickAddButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<TransactionType>('expense')
  const [selectedCategory, setSelectedCategory] = useState<Tables<'categories'> | null>(null)
  const [incomePreset, setIncomePreset] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null)
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Recurring transaction fields
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [showRecurringSuggestions, setShowRecurringSuggestions] = useState(false)
  const [billCreated, setBillCreated] = useState(false)

  const supabase = createClient()

  const categories = transactionType === 'income' ? incomeCategories : expenseCategories
  const isExpense = transactionType === 'expense'
  const isSubscription = transactionType === 'subscription'
  const isInvestment = transactionType === 'investment'
  const requiresCategory = isExpense // Only regular expenses require category

  function resetForm() {
    setSelectedCategory(null)
    setIncomePreset(null)
    setAmount('')
    setDescription('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setShowSuccess(false)
    setTransactionType('expense')
    setSelectedCardId(null)
    setSelectedInvestmentId(null)
    setSelectedBankAccountId(null)
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
    setSelectedInvestmentId(null)
    setSelectedBankAccountId(null)
    setSelectedCardId(null)
    // Subscriptions and investments are always recurring
    setIsRecurring(type === 'subscription' || type === 'investment')
    if (type === 'subscription' || type === 'investment') {
      setFrequency('monthly')
    }
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

    // Validation: expenses require category, subscriptions/investments just need amount + description
    const hasValidSelection = requiresCategory
      ? selectedCategory
      : isInvestment
        ? (selectedInvestmentId && description)
        : (isSubscription ? description : (selectedCategory || incomePreset))

    if (!hasValidSelection || !amount) return

    // Investments require an account selection
    if (isInvestment && !selectedInvestmentId) return

    setLoading(true)

    // For subscriptions/investments without category, use first expense category as fallback
    const categoryId = selectedCategory?.id || expenseCategories[0]?.id
    if (!categoryId && !isInvestment) {
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    // Create the transaction (investments and subscriptions are recorded as expenses)
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      category_id: categoryId || expenseCategories[0]?.id,
      amount: parseFloat(amount),
      type: (isInvestment || isSubscription) ? 'expense' : transactionType,
      description: description || selectedCategory?.name || incomePreset || 'Income',
      date: date,
      account_id: (isExpense || isSubscription) && selectedCardId ? selectedCardId : isInvestment ? selectedInvestmentId : transactionType === 'income' && selectedBankAccountId ? selectedBankAccountId : null,
      is_recurring: isRecurring,
    })

    // If expense or subscription was added to a credit card, increase card balance (debt increases)
    // If expense or subscription was added to a bank account, decrease bank balance (money leaves)
    if (!error && (isExpense || isSubscription) && selectedCardId) {
      const card = creditCards.find(c => c.id === selectedCardId)
      if (card) {
        await supabase
          .from('accounts')
          .update({
            balance: card.balance + parseFloat(amount),
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedCardId)
      } else {
        // Check if it's a bank account
        const bank = bankAccounts.find(a => a.id === selectedCardId)
        if (bank) {
          await supabase
            .from('accounts')
            .update({
              balance: bank.balance - parseFloat(amount),
              updated_at: new Date().toISOString(),
            })
            .eq('id', selectedCardId)
        }
      }
    }

    // If investment contribution, update the investment account balance
    if (!error && isInvestment && selectedInvestmentId) {
      const account = investmentAccounts.find(a => a.id === selectedInvestmentId)
      if (account) {
        await supabase
          .from('accounts')
          .update({
            balance: account.balance + parseFloat(amount),
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedInvestmentId)
      }
    }

    // If income was deposited to a bank account, increase the bank balance
    if (!error && transactionType === 'income' && selectedBankAccountId) {
      const bank = bankAccounts.find(a => a.id === selectedBankAccountId)
      if (bank) {
        await supabase
          .from('accounts')
          .update({
            balance: bank.balance + parseFloat(amount),
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedBankAccountId)
      }
    }

    // If recurring (subscription, expense, or investment), create a bill automatically
    // But only if a bill with the same name doesn't already exist
    if (!error && isRecurring && (isExpense || isSubscription || isInvestment) && description) {
      const { data: existingBill } = await supabase
        .from('bills')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', description)
        .eq('is_active', true)
        .limit(1)

      if (!existingBill || existingBill.length === 0) {
        const dueDay = new Date(date).getDate()
        const nextDue = new Date(date) // Use selected date as base
        // If selected date is in the past, move to next occurrence
        if (nextDue <= new Date()) {
          nextDue.setMonth(nextDue.getMonth() + 1)
        }

        const { error: billError } = await supabase.from('bills').insert({
          user_id: user.id,
          category_id: categoryId || expenseCategories[0]?.id,
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
    }

    if (!error) {
      // Show success state
      setShowSuccess(true)
      setLoading(false)

      // Wait for user to see success, then close and refresh
      setTimeout(() => {
        handleClose()
        router.refresh()
      }, 1500)
      return
    }

    setLoading(false)
  }

  const hasValidSelection = requiresCategory
    ? selectedCategory
    : isInvestment
      ? (selectedInvestmentId && description)
      : isSubscription
        ? description
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
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-add-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-label="Close modal"
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 pb-24 animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="quick-add-title" className={`font-display text-xl font-semibold ${
            isInvestment ? 'text-sprout-700' : isSubscription ? 'text-bloom-700' : isExpense ? 'text-gray-900' : 'text-sprout-700'
          }`}>
            {isInvestment ? 'Add Investment' : isSubscription ? 'Add Subscription' : isExpense ? 'Add Expense' : 'Add Income'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Success State */}
        {showSuccess ? (
          <div className="py-12 text-center">
            <div className={`w-16 h-16 rounded-full ${
              isInvestment ? 'bg-sprout-100' : isSubscription ? 'bg-bloom-100' : isExpense ? 'bg-bloom-100' : 'bg-sprout-100'
            } flex items-center justify-center mx-auto mb-4`}>
              <CheckCircle2 className={`w-8 h-8 ${
                isInvestment ? 'text-sprout-600' : isSubscription ? 'text-bloom-600' : isExpense ? 'text-bloom-600' : 'text-sprout-600'
              }`} />
            </div>
            <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
              {isInvestment ? 'Investment Added!' : isSubscription ? 'Subscription Added!' : isExpense ? 'Expense Added!' : 'Income Added!'}
            </h3>
            <p className="text-gray-500 text-sm">
              {isInvestment
                ? 'Your investment contribution has been recorded.'
                : isSubscription || billCreated
                  ? 'Your subscription has been added to upcoming bills.'
                  : `Your ${isExpense ? 'expense' : 'income'} has been recorded.`}
            </p>
          </div>
        ) : (
          <>
            {/* Type Toggle */}
            <div className="mb-5">
              <div className="grid grid-cols-4 gap-1 bg-gray-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => handleTypeChange('expense')}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                    transactionType === 'expense'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('subscription')}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                    transactionType === 'subscription'
                      ? 'bg-white text-bloom-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Recurring
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('income')}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                    transactionType === 'income'
                      ? 'bg-white text-sprout-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('investment')}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                    transactionType === 'investment'
                      ? 'bg-white text-sprout-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Invest
                </button>
              </div>
            </div>

            {/* Bill Created Success */}
            {billCreated && (
              <div className="mb-4 p-3 bg-sprout-50 rounded-xl flex items-center gap-2 text-sprout-700">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Bill created! It&apos;ll appear in upcoming bills.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
          {/* Quick Recurring Suggestions - for expenses and subscriptions */}
          {(isExpense || isSubscription) && !selectedCategory && !amount && (
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

          {/* Category - for expenses (required) and subscriptions (optional) */}
          {(isExpense || isSubscription) && (
            <div>
              <label className="label">
                Category {isSubscription && <span className="text-gray-400 font-normal">(optional)</span>}
              </label>
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

          {/* Investment Account Selection - for investments */}
          {isInvestment && (
            <div>
              <label className="label">Investment Account</label>
              {investmentAccounts.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-xl text-center">
                  <TrendingUp className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-amber-700 font-medium">No investment accounts yet</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Add an investment account in Net Worth to track contributions
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {investmentAccounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setSelectedInvestmentId(account.id)}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                        selectedInvestmentId === account.id
                          ? 'bg-sprout-100 text-sprout-700 border-2 border-sprout-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-sprout-50 border-2 border-transparent'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      {account.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Income Source - for income only */}
          {transactionType === 'income' && (
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

          {/* Deposit To - for income only */}
          {transactionType === 'income' && bankAccounts.length > 0 && (
            <div>
              <label className="label">Deposit to (optional)</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBankAccountId(null)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                    selectedBankAccountId === null
                      ? 'bg-gray-200 text-gray-800'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-150'
                  }`}
                >
                  No account
                </button>
                {bankAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setSelectedBankAccountId(account.id)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                      selectedBankAccountId === account.id
                        ? 'bg-sprout-100 text-sprout-700'
                        : 'bg-gray-100 text-gray-500 hover:bg-sprout-50'
                    }`}
                  >
                    <Landmark className="w-3.5 h-3.5" />
                    {account.name}
                  </button>
                ))}
              </div>
              {selectedBankAccountId && (
                <p className="text-xs text-sprout-600 mt-1.5">
                  This income will be added to your account balance
                </p>
              )}
            </div>
          )}

          {/* Recurring Toggle - for expenses only (not subscriptions/investments, they're always recurring) */}
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
                    We&apos;ll automatically add this to your upcoming bills
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Frequency selector - for subscriptions and investments */}
          {(isSubscription || isInvestment) && (
            <div className={`p-4 rounded-xl ${isInvestment ? 'bg-sprout-50' : 'bg-bloom-50'}`}>
              <label className={`text-sm font-medium mb-2 block ${isInvestment ? 'text-sprout-700' : 'text-bloom-700'}`}>
                {isInvestment ? 'How often do you contribute?' : 'How often is this charged?'}
              </label>
              <div className="flex flex-wrap gap-2">
                {(['weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly'] as Frequency[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      frequency === f
                        ? isInvestment ? 'bg-sprout-500 text-white' : 'bg-bloom-500 text-white'
                        : isInvestment ? 'bg-white text-sprout-600 hover:bg-sprout-100' : 'bg-white text-bloom-600 hover:bg-bloom-100'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment Method Selection - for expenses and subscriptions */}
          {(isExpense || isSubscription) && (creditCards.length > 0 || bankAccounts.length > 0) && (
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
                {bankAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setSelectedCardId(account.id)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                      selectedCardId === account.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500 hover:bg-blue-50'
                    }`}
                  >
                    <Landmark className="w-3.5 h-3.5" />
                    {account.name}
                  </button>
                ))}
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
              {selectedCardId && creditCards.find(c => c.id === selectedCardId) && (
                <p className="text-xs text-purple-600 mt-1.5">
                  This expense will be added to your credit card balance
                </p>
              )}
              {selectedCardId && bankAccounts.find(a => a.id === selectedCardId) && (
                <p className="text-xs text-blue-600 mt-1.5">
                  This expense will be deducted from your account balance
                </p>
              )}
            </div>
          )}

          {/* Date */}
          <DatePicker
            label={isSubscription || isInvestment ? 'Next Payment Date' : 'Date'}
            value={date}
            onChange={setDate}
            allowFuture={isSubscription || isInvestment}
          />

          {/* Description */}
          <div>
            <label className="label">
              {isInvestment ? 'Investment Name' : 'Description'} {!isRecurring && !isSubscription && !isInvestment && '(optional)'}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isInvestment ? 'e.g., Vanguard ETF, Bitcoin, Super' :
                isSubscription ? 'e.g., Netflix, Spotify, Gym' :
                isRecurring ? 'e.g., Netflix, Gym membership' :
                isExpense ? 'What was this for?' : 'e.g., Tax refund from ATO'
              }
              className="input"
              required={isRecurring || isSubscription || isInvestment}
            />
            {(isRecurring || isSubscription || isInvestment) && !description && (
              <p className="text-xs text-amber-600 mt-1">
                {isInvestment ? 'Required to track your investment' : 'Required for creating a bill'}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !isFormValid || ((isRecurring || isSubscription || isInvestment) && !description)}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isExpense || isSubscription
                ? 'bg-gradient-to-r from-bloom-500 to-bloom-600 text-white shadow-lg shadow-bloom-500/30 hover:shadow-bloom-500/40'
                : 'bg-gradient-to-r from-sprout-500 to-sprout-600 text-white shadow-lg shadow-sprout-500/30 hover:shadow-sprout-500/40'
            }`}
          >
            {loading ? 'Saving...' : isInvestment ? 'Add Investment' : isSubscription ? 'Add Subscription' : isRecurring ? 'Save & Create Bill' : 'Save'}
          </button>
        </form>
          </>
        )}
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
