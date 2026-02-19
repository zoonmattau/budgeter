'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, CreditCard, RefreshCw, Calendar, CheckCircle2, TrendingUp, Landmark, ArrowRightLeft, Users, User, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { CategoryChip } from '@/components/ui/category-chip'
import { CurrencyInput } from '@/components/ui/currency-input'
import { DatePicker } from '@/components/ui/date-picker'
import { CreateCategoryModal } from '@/components/categories/create-category-modal'
import { useScopeOptional } from '@/lib/scope-context'
import type { Tables } from '@/lib/database.types'
import { awardXP, checkAndUnlockAchievements } from '@/app/actions/gamification'
import type { AchievementType } from '@/lib/gamification'
import { AchievementToast } from '@/components/ui/achievement-toast'

interface QuickAddButtonProps {
  expenseCategories: Tables<'categories'>[]
  incomeCategories: Tables<'categories'>[]
  creditCards?: Tables<'accounts'>[]
  investmentAccounts?: Tables<'accounts'>[]
  bankAccounts?: Tables<'accounts'>[]
  debtAccounts?: Tables<'accounts'>[]
}

type TransactionType = 'expense' | 'income' | 'subscription' | 'investment' | 'payment'
type Frequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'

// Quick-select presets for income
const INCOME_PRESETS = [
  { name: 'Bonus', icon: 'gift' },
  { name: 'Gift', icon: 'heart' },
  { name: 'Refund', icon: 'rotate-ccw' },
  { name: 'Tax Return', icon: 'landmark' },
  { name: 'Side Hustle', icon: 'briefcase' },
]


export function QuickAddButton({ expenseCategories: initialExpenseCategories, incomeCategories: initialIncomeCategories, creditCards = [], investmentAccounts = [], bankAccounts = [], debtAccounts = [] }: QuickAddButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [localExpenseCategories, setLocalExpenseCategories] = useState(initialExpenseCategories)
  const [localIncomeCategories, setLocalIncomeCategories] = useState(initialIncomeCategories)
  const [transactionType, setTransactionType] = useState<TransactionType>('expense')
  const [selectedCategory, setSelectedCategory] = useState<Tables<'categories'> | null>(null)
  const [incomePreset, setIncomePreset] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null)
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null)
  const [selectedFromAccountId, setSelectedFromAccountId] = useState<string | null>(null)
  const [selectedToAccountId, setSelectedToAccountId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [toastAchievements, setToastAchievements] = useState<AchievementType[]>([])
  const [toastLevelUp, setToastLevelUp] = useState<{ icon: string; name: string; level: number } | null>(null)

  // Recurring transaction fields
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [billCreated, setBillCreated] = useState(false)

  const scopeContext = useScopeOptional()
  const householdId = scopeContext?.householdId || null
  const isInHousehold = !!householdId
  const [forHousehold, setForHousehold] = useState(scopeContext?.scope === 'household' && isInHousehold)
  const isHouseholdScope = forHousehold && isInHousehold

  const supabase = createClient()

  // Filter out budget-only categories that don't make sense for logging transactions
  const budgetOnlyNames = ['savings', 'saving', 'emergency', 'emergency fund', 'subscriptions', 'subscription', 'fixed bills', 'bills', 'bills & subscriptions']
  const allExpenseCategories = localExpenseCategories
  const expenseCategories = localExpenseCategories.filter(c =>
    !budgetOnlyNames.includes(c.name.toLowerCase())
  )
  const incomeCategories = localIncomeCategories
  const categories = transactionType === 'income' ? incomeCategories : expenseCategories
  const isExpense = transactionType === 'expense'
  const isSubscription = transactionType === 'subscription'
  const isInvestment = transactionType === 'investment'
  const isPayment = transactionType === 'payment'
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
    setSelectedFromAccountId(null)
    setSelectedToAccountId(null)
    setNotes('')
    setIsRecurring(false)
    setFrequency('monthly')
    setBillCreated(false)
    setForHousehold(scopeContext?.scope === 'household' && isInHousehold)
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
    setSelectedFromAccountId(null)
    setSelectedToAccountId(null)
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

async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validation: expenses require category, subscriptions/investments just need amount + description
    const hasValidSelection = isPayment
      ? (selectedFromAccountId && selectedToAccountId)
      : requiresCategory
        ? selectedCategory
        : isInvestment
          ? (selectedInvestmentId && description)
          : (isSubscription ? description : (selectedCategory || incomePreset))

    if (!hasValidSelection || !amount) return

    // Investments require an account selection
    if (isInvestment && !selectedInvestmentId) return

    // Payments require both from and to accounts
    if (isPayment && (!selectedFromAccountId || !selectedToAccountId)) return

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    // Handle payment type separately
    if (isPayment && selectedFromAccountId && selectedToAccountId) {
      const toAccount = debtAccounts.find(a => a.id === selectedToAccountId)
      const fromAccount = bankAccounts.find(a => a.id === selectedFromAccountId)
      const paymentAmount = parseFloat(amount)
      const paymentDescription = description || `Payment to ${toAccount?.name || 'debt account'}`

      // Insert transaction record
      const { error: txnError } = await supabase.from('transactions').insert({
        user_id: user.id,
        category_id: allExpenseCategories[0]?.id,
        amount: paymentAmount,
        type: 'transfer',
        description: paymentDescription,
        date: date,
        account_id: selectedFromAccountId,
        to_account_id: selectedToAccountId,
        is_recurring: false,
        ...(isHouseholdScope && { household_id: householdId }),
      })

      if (!txnError) {
        // Decrease source bank account balance
        if (fromAccount) {
          await supabase
            .from('accounts')
            .update({
              balance: fromAccount.balance - paymentAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', selectedFromAccountId)
        }

        // Decrease destination debt account balance
        if (toAccount) {
          await supabase
            .from('accounts')
            .update({
              balance: toAccount.balance - paymentAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', selectedToAccountId)
        }

        setShowSuccess(true)
        setLoading(false)
        setTimeout(() => {
          handleClose()
          router.refresh()
        }, 1500)
        return
      }

      setLoading(false)
      return
    }

    // For subscriptions/investments without category, use first expense category as fallback
    const categoryId = selectedCategory?.id || allExpenseCategories[0]?.id
    if (!categoryId && !isInvestment) {
      setLoading(false)
      return
    }

    // Check if the transaction date is in the future
    const isFutureDate = new Date(date) > new Date(format(new Date(), 'yyyy-MM-dd'))

    // Only create a transaction record if the date is today or in the past
    // Future-dated recurring items just create a bill (handled below)
    let error: { message: string; code?: string } | null = null
    if (!isFutureDate) {
      const { error: txnError } = await supabase.from('transactions').insert({
        user_id: user.id,
        category_id: categoryId || allExpenseCategories[0]?.id,
        amount: parseFloat(amount),
        type: (isInvestment || isSubscription) ? 'expense' : transactionType,
        description: description || selectedCategory?.name || incomePreset || 'Income',
        date: date,
        account_id: (isExpense || isSubscription) && selectedCardId ? selectedCardId : isInvestment ? selectedInvestmentId : transactionType === 'income' && selectedBankAccountId ? selectedBankAccountId : null,
        is_recurring: isRecurring,
        notes: notes || null,
        ...(isHouseholdScope && { household_id: householdId }),
      })
      error = txnError
    } else if (!isRecurring && !isSubscription && !isInvestment) {
      // Non-recurring future transactions still get created (user explicitly chose a future date)
      const { error: txnError } = await supabase.from('transactions').insert({
        user_id: user.id,
        category_id: categoryId || allExpenseCategories[0]?.id,
        amount: parseFloat(amount),
        type: transactionType,
        description: description || selectedCategory?.name || incomePreset || 'Income',
        date: date,
        account_id: (isExpense || isSubscription) && selectedCardId ? selectedCardId : transactionType === 'income' && selectedBankAccountId ? selectedBankAccountId : null,
        is_recurring: false,
        notes: notes || null,
        ...(isHouseholdScope && { household_id: householdId }),
      })
      error = txnError
    }

    // Only update account balances for transactions that happened (not future-dated)
    if (!error && !isFutureDate) {
      // If expense or subscription was added to a credit card, increase card balance (debt increases)
      // If expense or subscription was added to a bank account, decrease bank balance (money leaves)
      if ((isExpense || isSubscription) && selectedCardId) {
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
      if (isInvestment && selectedInvestmentId) {
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
      if (transactionType === 'income' && selectedBankAccountId) {
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
    }

    // If recurring (subscription, expense, or investment), create a bill automatically
    // But only if a bill with the same name doesn't already exist
    if (!error && isRecurring && (isExpense || isSubscription || isInvestment) && description) {
      let existingBillQuery = supabase
        .from('bills')
        .select('id')
        .ilike('name', description)
        .eq('is_active', true)
        .limit(1)

      if (isHouseholdScope) {
        existingBillQuery = existingBillQuery.eq('household_id', householdId!)
      } else {
        existingBillQuery = existingBillQuery.eq('user_id', user.id)
      }

      const { data: existingBill } = await existingBillQuery

      if (!existingBill || existingBill.length === 0) {
        const dueDay = new Date(date).getDate()
        const nextDue = new Date(date) // Use selected date as base
        // If selected date is in the past, move to next occurrence
        if (nextDue <= new Date()) {
          nextDue.setMonth(nextDue.getMonth() + 1)
        }

        const { error: billError } = await supabase.from('bills').insert({
          user_id: user.id,
          category_id: categoryId || allExpenseCategories[0]?.id,
          name: description,
          amount: parseFloat(amount),
          frequency: frequency,
          due_day: dueDay,
          next_due: nextDue.toISOString().split('T')[0],
          is_active: true,
          ...(isHouseholdScope && { household_id: householdId }),
        })

        if (!billError) {
          setBillCreated(true)
        }
      }
    }

    if (!error) {
      // Award XP and check achievements for expense/income transactions (not future-dated)
      if (!isFutureDate && (isExpense || transactionType === 'income')) {
        const [xpResult, unlocked] = await Promise.all([
          awardXP(user.id, 10),
          checkAndUnlockAchievements(user.id, { transactionCount: 1 }),
        ])
        if (unlocked.length > 0) setToastAchievements(unlocked)
        if (xpResult.leveledUp && xpResult.newLevelName && xpResult.newLevelIcon && xpResult.newLevel) {
          setToastLevelUp({ icon: xpResult.newLevelIcon, name: xpResult.newLevelName, level: xpResult.newLevel })
        }
      }

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

  const hasValidSelection = isPayment
    ? (selectedFromAccountId && selectedToAccountId)
    : requiresCategory
      ? selectedCategory
      : isInvestment
        ? (selectedInvestmentId && description)
        : isSubscription
          ? description
          : (selectedCategory || incomePreset)
  const isFormValid = hasValidSelection && amount

  const toast = (toastAchievements.length > 0 || toastLevelUp) ? (
    <AchievementToast
      achievements={toastAchievements}
      levelUp={toastLevelUp}
      onDismiss={() => { setToastAchievements([]); setToastLevelUp(null) }}
    />
  ) : null

  if (!isOpen) {
    return (
      <>
        <button
          onClick={handleOpen}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-bloom-500 to-bloom-600 text-white shadow-lg shadow-bloom-500/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
        {toast}
      </>
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
            isPayment ? 'text-blue-700' : isInvestment ? 'text-sprout-700' : isSubscription ? 'text-bloom-700' : isExpense ? 'text-gray-900' : 'text-sprout-700'
          }`}>
            {isPayment ? 'Make Payment' : isInvestment ? 'Add Investment' : isSubscription ? 'Add Subscription' : isExpense ? 'Add Expense' : 'Add Income'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Personal / Household Toggle */}
        {isInHousehold && !showSuccess && (
          <div className="mb-4 flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setForHousehold(false)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                !forHousehold
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Personal
            </button>
            <button
              type="button"
              onClick={() => setForHousehold(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                forHousehold
                  ? 'bg-white text-bloom-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Household
            </button>
          </div>
        )}

        {/* Success State */}
        {showSuccess ? (
          <div className="py-12 text-center">
            <div className={`w-16 h-16 rounded-full ${
              isPayment ? 'bg-blue-100' : isInvestment ? 'bg-sprout-100' : isSubscription ? 'bg-bloom-100' : isExpense ? 'bg-bloom-100' : 'bg-sprout-100'
            } flex items-center justify-center mx-auto mb-4`}>
              <CheckCircle2 className={`w-8 h-8 ${
                isPayment ? 'text-blue-600' : isInvestment ? 'text-sprout-600' : isSubscription ? 'text-bloom-600' : isExpense ? 'text-bloom-600' : 'text-sprout-600'
              }`} />
            </div>
            <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
              {isPayment ? 'Payment Recorded!' : isInvestment ? 'Investment Added!' : isSubscription ? 'Subscription Added!' : isExpense ? 'Expense Added!' : 'Income Added!'}
            </h3>
            <p className="text-gray-500 text-sm">
              {isPayment
                ? 'Both account balances have been updated.'
                : isInvestment
                  ? 'Your investment contribution has been recorded.'
                  : isSubscription || billCreated
                    ? 'Your subscription has been added to upcoming bills.'
                    : `Your ${isExpense ? 'expense' : 'income'} has been recorded.`}
            </p>
          </div>
        ) : (
          <>
            {/* Type Toggle - Grouped */}
            <div className="mb-5 space-y-2">
              {/* Group selector */}
              <div className="grid grid-cols-3 gap-1 bg-gray-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => { if (transactionType !== 'expense' && transactionType !== 'subscription') handleTypeChange('expense') }}
                  className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
                    isExpense || isSubscription
                      ? 'bg-white text-bloom-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Money Out
                </button>
                <button
                  type="button"
                  onClick={() => { if (transactionType !== 'income' && transactionType !== 'investment') handleTypeChange('income') }}
                  className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
                    transactionType === 'income' || isInvestment
                      ? 'bg-white text-sprout-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Money In
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('payment')}
                  className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
                    isPayment
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Transfer
                </button>
              </div>

              {/* Sub-type selector for Money Out */}
              {(isExpense || isSubscription) && (
                <div className="grid grid-cols-2 gap-1 bg-bloom-50 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                      isExpense
                        ? 'bg-white text-bloom-600 shadow-sm'
                        : 'text-bloom-400 hover:text-bloom-600'
                    }`}
                  >
                    One-off Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('subscription')}
                    className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                      isSubscription
                        ? 'bg-white text-bloom-600 shadow-sm'
                        : 'text-bloom-400 hover:text-bloom-600'
                    }`}
                  >
                    Recurring Bill
                  </button>
                </div>
              )}

              {/* Sub-type selector for Money In */}
              {(transactionType === 'income' || isInvestment) && (
                <div className="grid grid-cols-2 gap-1 bg-sprout-50 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('income')}
                    className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                      transactionType === 'income'
                        ? 'bg-white text-sprout-600 shadow-sm'
                        : 'text-sprout-400 hover:text-sprout-600'
                    }`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('investment')}
                    className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                      isInvestment
                        ? 'bg-white text-sprout-600 shadow-sm'
                        : 'text-sprout-400 hover:text-sprout-600'
                    }`}
                  >
                    Investment
                  </button>
                </div>
              )}
            </div>

            {/* Bill Created Success */}
            {billCreated && (
              <div className="mb-4 p-3 bg-sprout-50 rounded-xl flex items-center gap-2 text-sprout-700">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Bill created! It&apos;ll appear in upcoming bills.</span>
              </div>
            )}

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

          {/* Category - for expenses (required) and subscriptions (optional) */}
          {(isExpense || isSubscription) && (
            <div>
              <label className="label">
                Category {isSubscription && <span className="text-gray-400 font-normal">(optional)</span>}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {categories.slice(0, 11).map((cat) => (
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
                <button
                  type="button"
                  onClick={() => setShowCreateCategory(true)}
                  className="p-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all flex flex-col items-center justify-center gap-1"
                >
                  <div className="w-8 h-8 rounded-xl bg-gray-200 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">New</span>
                </button>
              </div>
              {categories.length > 11 && (
                <div className="mt-2 relative">
                  <select
                    value={selectedCategory && categories.indexOf(selectedCategory) >= 11 ? selectedCategory.id : ''}
                    onChange={(e) => {
                      const cat = categories.find(c => c.id === e.target.value)
                      if (cat) handleCategorySelect(cat)
                    }}
                    className="input py-2 text-sm appearance-none pr-8"
                  >
                    <option value="">More categories...</option>
                    {categories.slice(11).map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
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
              <p className="text-xs text-gray-400 mb-2">Or select a category:</p>
              <div className="grid grid-cols-4 gap-2">
                {incomeCategories.slice(0, 11).map((cat) => (
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
                <button
                  type="button"
                  onClick={() => setShowCreateCategory(true)}
                  className="p-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all flex flex-col items-center justify-center gap-1"
                >
                  <div className="w-8 h-8 rounded-xl bg-gray-200 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">New</span>
                </button>
              </div>
              {incomeCategories.length > 11 && (
                <div className="mt-2 relative">
                  <select
                    value={selectedCategory && incomeCategories.indexOf(selectedCategory) >= 11 ? selectedCategory.id : ''}
                    onChange={(e) => {
                      const cat = incomeCategories.find(c => c.id === e.target.value)
                      if (cat) handleCategorySelect(cat)
                    }}
                    className="input py-2 text-sm appearance-none pr-8"
                  >
                    <option value="">More categories...</option>
                    {incomeCategories.slice(11).map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
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

          {/* Payment Account Selection - for payment type */}
          {isPayment && (
            <div className="space-y-4">
              <div>
                <label className="label">From (Bank Account)</label>
                {bankAccounts.length === 0 ? (
                  <div className="p-4 bg-amber-50 rounded-xl text-center">
                    <Landmark className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm text-amber-700 font-medium">No bank accounts yet</p>
                    <p className="text-xs text-amber-600 mt-1">
                      Add a bank account in Net Worth first
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {bankAccounts.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => setSelectedFromAccountId(account.id)}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                          selectedFromAccountId === account.id
                            ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                            : 'bg-gray-100 text-gray-600 hover:bg-blue-50 border-2 border-transparent'
                        }`}
                      >
                        <Landmark className="w-4 h-4" />
                        {account.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <ArrowRightLeft className="w-5 h-5 text-gray-400" />
              </div>

              <div>
                <label className="label">To (Debt Account)</label>
                {debtAccounts.length === 0 ? (
                  <div className="p-4 bg-amber-50 rounded-xl text-center">
                    <CreditCard className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm text-amber-700 font-medium">No debt accounts yet</p>
                    <p className="text-xs text-amber-600 mt-1">
                      Add a credit card or loan in Net Worth first
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {debtAccounts.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => setSelectedToAccountId(account.id)}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                          selectedToAccountId === account.id
                            ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                            : 'bg-gray-100 text-gray-600 hover:bg-purple-50 border-2 border-transparent'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        {account.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
              {isInvestment ? 'Investment Name' : 'Description'} {!isRecurring && !isSubscription && !isInvestment && !isPayment && '(optional)'}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isPayment ? 'e.g., Credit card payment' :
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

          {/* Notes (optional) */}
          {(isExpense || transactionType === 'income') && (
            <div>
              <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., reimbursable, split with Sarah..."
                className="input"
              />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !isFormValid || ((isRecurring || isSubscription || isInvestment) && !description)}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isPayment
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40'
                : isExpense || isSubscription
                  ? 'bg-gradient-to-r from-bloom-500 to-bloom-600 text-white shadow-lg shadow-bloom-500/30 hover:shadow-bloom-500/40'
                  : 'bg-gradient-to-r from-sprout-500 to-sprout-600 text-white shadow-lg shadow-sprout-500/30 hover:shadow-sprout-500/40'
            }`}
          >
            {loading ? 'Saving...' : isPayment ? 'Record Payment' : isInvestment ? 'Add Investment' : isSubscription ? 'Add Subscription' : isRecurring ? 'Save & Create Bill' : 'Save'}
          </button>
        </form>
          </>
        )}
      </div>

      {showCreateCategory && (
        <CreateCategoryModal
          type={transactionType === 'income' ? 'income' : 'expense'}
          onClose={() => setShowCreateCategory(false)}
          onCreated={(category) => {
            if (category.type === 'income') {
              setLocalIncomeCategories(prev => [category, ...prev])
            } else {
              setLocalExpenseCategories(prev => [category, ...prev])
            }
            setSelectedCategory(category)
          }}
        />
      )}

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
      {toast}
    </div>
  )
}
