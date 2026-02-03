'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Sparkles, Lightbulb, PiggyBank, Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CurrencyInput } from '@/components/ui/currency-input'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/database.types'

// Time frame options with conversion to monthly
// Using 365.25 days/year for accuracy (accounts for leap years)
const DAYS_PER_MONTH = 365.25 / 12 // ~30.4375 days
const TIME_FRAMES = [
  { id: 'week', label: 'Per week', multiplier: DAYS_PER_MONTH / 7 },      // ~4.348
  { id: 'fortnight', label: 'Per fortnight', multiplier: DAYS_PER_MONTH / 14 }, // ~2.174
  { id: 'month', label: 'Per month', multiplier: 1 },
] as const

type TimeFrame = typeof TIME_FRAMES[number]['id']

// Subscription frequency options
const SUBSCRIPTION_FREQUENCIES = [
  { id: 'weekly', label: 'Weekly', multiplier: DAYS_PER_MONTH / 7 },  // ~4.348 weeks/month
  { id: 'monthly', label: 'Monthly', multiplier: 1 },
  { id: 'yearly', label: 'Yearly', multiplier: 1 / 12 },
] as const

type SubscriptionFrequency = typeof SUBSCRIPTION_FREQUENCIES[number]['id']

interface Subscription {
  id: string
  name: string
  amount: number
  frequency: SubscriptionFrequency
}

// Questions we ask the user - grouped by type
// Each has clean round numbers for week/fortnight/month
const BUDGET_QUESTIONS = [
  // Fixed expenses - must pay
  {
    id: 'rent',
    question: "How much is your rent or mortgage?",
    icon: 'home',
    color: '#6366f1',
    category: 'Rent/Mortgage',
    type: 'fixed',
    quickAmounts: {
      week: [100, 200, 300, 400, 500],
      fortnight: [200, 400, 600, 800, 1000],
      month: [500, 1000, 1500, 2000, 2500],
    },
  },
  {
    id: 'utilities',
    question: "How much do you spend on utilities?",
    icon: 'zap',
    color: '#f59e0b',
    category: 'Utilities',
    type: 'fixed',
    quickAmounts: {
      week: [25, 40, 50, 75, 100],
      fortnight: [50, 75, 100, 150, 200],
      month: [100, 150, 200, 300, 400],
    },
  },
  {
    id: 'transport',
    question: "How much do you spend on transport?",
    icon: 'car',
    color: '#3b82f6',
    category: 'Transport',
    type: 'fixed',
    quickAmounts: {
      week: [25, 50, 100, 150, 200],
      fortnight: [50, 100, 200, 300, 400],
      month: [100, 200, 400, 600, 800],
    },
  },
  {
    id: 'subscriptions',
    question: "How much do you spend on subscriptions?",
    icon: 'credit-card',
    color: '#14b8a6',
    category: 'Subscriptions',
    type: 'fixed',
    quickAmounts: {
      week: [5, 10, 25, 40, 50],
      fortnight: [10, 25, 50, 75, 100],
      month: [20, 50, 100, 150, 200],
    },
  },
  // Variable expenses - can reduce
  {
    id: 'groceries',
    question: "How much do you spend on groceries?",
    icon: 'shopping-cart',
    color: '#22c55e',
    category: 'Groceries',
    type: 'variable',
    quickAmounts: {
      week: [50, 75, 100, 125, 150],
      fortnight: [100, 150, 200, 250, 300],
      month: [200, 300, 400, 500, 600],
    },
  },
  {
    id: 'dining',
    question: "How much do you spend on dining out?",
    icon: 'utensils',
    color: '#f97316',
    category: 'Dining Out',
    type: 'variable',
    quickAmounts: {
      week: [10, 25, 40, 50, 75],
      fortnight: [25, 50, 75, 100, 150],
      month: [50, 100, 150, 200, 300],
    },
  },
  {
    id: 'entertainment',
    question: "How much do you spend on entertainment?",
    icon: 'tv',
    color: '#ec4899',
    category: 'Entertainment',
    type: 'variable',
    quickAmounts: {
      week: [10, 15, 25, 40, 50],
      fortnight: [15, 25, 50, 75, 100],
      month: [25, 50, 100, 150, 200],
    },
  },
  {
    id: 'shopping',
    question: "How much do you spend on shopping?",
    icon: 'shopping-bag',
    color: '#8b5cf6',
    category: 'Shopping',
    type: 'variable',
    quickAmounts: {
      week: [10, 25, 50, 75, 125],
      fortnight: [25, 50, 100, 150, 250],
      month: [50, 100, 200, 300, 500],
    },
  },
]

interface BudgetWizardProps {
  categories: Tables<'categories'>[]
  totalIncome: number
  currentMonth: string
  onComplete: () => void
  onCancel: () => void
}

export function BudgetWizard({
  categories: existingCategories,
  totalIncome,
  currentMonth,
  onComplete,
  onCancel,
}: BudgetWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [currentAmount, setCurrentAmount] = useState('')
  const [currentTimeFrame, setCurrentTimeFrame] = useState<TimeFrame>('month')
  const [saving, setSaving] = useState(false)

  // Subscription tracking
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [newSubName, setNewSubName] = useState('')
  const [newSubAmount, setNewSubAmount] = useState('')
  const [newSubFrequency, setNewSubFrequency] = useState<SubscriptionFrequency>('monthly')

  // Leftover money allocation
  const [showLeftoverStep, setShowLeftoverStep] = useState(false)
  const [leftoverAllocations, setLeftoverAllocations] = useState<Record<string, number>>({})

  // Leftover allocation options
  const LEFTOVER_OPTIONS = [
    {
      id: 'emergency',
      name: 'Emergency Fund',
      icon: '🛡️',
      color: '#3b82f6',
      description: 'Money set aside for unexpected expenses like car repairs, medical bills, or job loss. Most experts recommend having 3-6 months of expenses saved up.',
      tip: 'This is your financial safety net - aim to build this first!',
    },
    {
      id: 'debt',
      name: 'Pay Off Debt',
      icon: '💳',
      color: '#ef4444',
      description: 'Extra payments towards credit cards, personal loans, or other debt. Paying more than the minimum helps you become debt-free faster and saves money on interest.',
      tip: 'High-interest debt (like credit cards) should usually be paid off before investing.',
    },
    {
      id: 'invest',
      name: 'Investments',
      icon: '📈',
      color: '#22c55e',
      description: 'Money that grows over time through shares, ETFs, super contributions, or property. Starting early means your money has more time to grow.',
      tip: 'Even small amounts add up over time thanks to compound growth!',
    },
    {
      id: 'fun',
      name: 'Fun Money',
      icon: '🎉',
      color: '#d946ef',
      description: 'Money for guilt-free spending on things that make you happy - hobbies, treats, experiences. Having some fun money helps you stick to your budget long-term.',
      tip: 'Budgeting is about balance - it\'s okay to enjoy your money too!',
    },
  ]

  const supabase = createClient()

  const currentQuestion = BUDGET_QUESTIONS[currentStep]
  const isSubscriptionStep = currentQuestion?.id === 'subscriptions'
  const isQuestionsComplete = currentStep >= BUDGET_QUESTIONS.length
  const progress = (currentStep / (BUDGET_QUESTIONS.length + 1)) * 100 // +1 for leftover step

  // Calculate leftover allocations total
  const leftoverAllocated = Object.values(leftoverAllocations).reduce((sum, v) => sum + v, 0)

  // Calculate total monthly subscription cost
  const subscriptionMonthlyTotal = subscriptions.reduce((sum, sub) => {
    const freq = SUBSCRIPTION_FREQUENCIES.find(f => f.id === sub.frequency)
    return sum + Math.round(sub.amount * (freq?.multiplier || 1))
  }, 0)

  // Calculate totals
  const totalFixed = BUDGET_QUESTIONS
    .filter(q => q.type === 'fixed')
    .reduce((sum, q) => sum + (answers[q.id] || 0), 0)

  const totalVariable = BUDGET_QUESTIONS
    .filter(q => q.type === 'variable')
    .reduce((sum, q) => sum + (answers[q.id] || 0), 0)

  const totalAllocated = totalFixed + totalVariable
  const remaining = totalIncome - totalAllocated
  const savingsRate = totalIncome > 0 ? (remaining / totalIncome) * 100 : 0

  function handleNext() {
    // Special handling for subscriptions step
    if (isSubscriptionStep) {
      setAnswers(prev => ({ ...prev, subscriptions: subscriptionMonthlyTotal }))
      // If this is the last question and there's leftover money, show leftover step
      const isLastQuestion = currentStep === BUDGET_QUESTIONS.length - 1
      if (isLastQuestion) {
        // Calculate remaining after subscriptions
        const newTotal = Object.entries(answers).reduce((sum, [, val]) => sum + (val || 0), 0) + subscriptionMonthlyTotal
        const newRemaining = totalIncome - newTotal
        if (newRemaining > 0) {
          setShowLeftoverStep(true)
        }
      }
      setCurrentStep(prev => prev + 1)
      return
    }

    const rawAmount = parseFloat(currentAmount) || 0
    // Convert to monthly amount
    const timeFrame = TIME_FRAMES.find(t => t.id === currentTimeFrame)
    const monthlyAmount = Math.round(rawAmount * (timeFrame?.multiplier || 1))
    if (currentQuestion) {
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: monthlyAmount }))
    }
    setCurrentAmount('')
    setCurrentTimeFrame('month')

    // Check if this is the last question and there's leftover money
    const isLastQuestion = currentStep === BUDGET_QUESTIONS.length - 1
    if (isLastQuestion) {
      // Calculate remaining with the new amount
      const newTotal = Object.entries(answers).reduce((sum, [, val]) => sum + (val || 0), 0) + monthlyAmount
      const newRemaining = totalIncome - newTotal
      if (newRemaining > 0) {
        setShowLeftoverStep(true)
      }
    }
    setCurrentStep(prev => prev + 1)
  }

  function handleBack() {
    if (currentStep > 0) {
      const prevQuestion = BUDGET_QUESTIONS[currentStep - 1]
      if (prevQuestion && answers[prevQuestion.id]) {
        // Show the monthly amount when going back
        setCurrentAmount(answers[prevQuestion.id].toString())
        setCurrentTimeFrame('month')
      } else {
        setCurrentAmount('')
        setCurrentTimeFrame('month')
      }
      setCurrentStep(prev => prev - 1)
    }
  }

  function handleSkip() {
    if (isSubscriptionStep) {
      setSubscriptions([])
    }
    setCurrentAmount('')
    setCurrentTimeFrame('month')
    setCurrentStep(prev => prev + 1)
  }

  // Subscription management functions
  function addSubscription(name: string, amount: number, frequency: SubscriptionFrequency) {
    const newSub: Subscription = {
      id: Date.now().toString(),
      name,
      amount,
      frequency,
    }
    setSubscriptions(prev => [...prev, newSub])
  }

  function removeSubscription(id: string) {
    setSubscriptions(prev => prev.filter(s => s.id !== id))
  }

  function handleAddCustomSubscription() {
    if (!newSubName.trim() || !newSubAmount) return
    addSubscription(newSubName.trim(), parseFloat(newSubAmount), newSubFrequency)
    setNewSubName('')
    setNewSubAmount('')
    setNewSubFrequency('monthly')
  }

  function handleLeftoverChange(id: string, value: string) {
    const num = parseFloat(value) || 0
    setLeftoverAllocations(prev => ({ ...prev, [id]: num }))
  }

  function handleLeftoverQuickAllocate(id: string) {
    // Put all remaining leftover into this category
    const currentlyAllocated = Object.entries(leftoverAllocations)
      .filter(([key]) => key !== id)
      .reduce((sum, [, val]) => sum + val, 0)
    const availableToAllocate = remaining - currentlyAllocated
    if (availableToAllocate > 0) {
      setLeftoverAllocations(prev => ({ ...prev, [id]: Math.max(0, availableToAllocate) }))
    }
  }

  function handleLeftoverNext() {
    setShowLeftoverStep(false)
  }

  function handleLeftoverBack() {
    setShowLeftoverStep(false)
    setCurrentStep(BUDGET_QUESTIONS.length - 1)
  }

  async function handleSave() {
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No user found')
        setSaving(false)
        return
      }

      // Create categories that don't exist and create budget allocations
      for (const question of BUDGET_QUESTIONS) {
        const amount = answers[question.id] || 0
        if (amount <= 0) continue

        // Check if category exists
        let categoryId: string
        const existingCat = existingCategories.find(
          c => c.name.toLowerCase() === question.category.toLowerCase()
        )

        if (existingCat) {
          categoryId = existingCat.id
        } else {
          // Create the category
          const { data: newCat, error: catError } = await supabase
            .from('categories')
            .insert({
              user_id: user.id,
              name: question.category,
              icon: question.icon,
              color: question.color,
              type: 'expense',
              sort_order: BUDGET_QUESTIONS.findIndex(q => q.id === question.id),
            })
            .select()
            .single()

          if (catError) {
            console.error('Error creating category:', catError)
            continue
          }
          if (!newCat) continue
          categoryId = newCat.id
        }

        // Delete existing budget for this category/month, then insert
        const { error: deleteError } = await supabase
          .from('budgets')
          .delete()
          .eq('user_id', user.id)
          .eq('category_id', categoryId)
          .eq('month', currentMonth)

        if (deleteError) {
          console.error('Error deleting budget:', deleteError)
        }

        const { error: insertError } = await supabase
          .from('budgets')
          .insert({
            user_id: user.id,
            category_id: categoryId,
            month: currentMonth,
            allocated: amount,
          })

        if (insertError) {
          console.error('Error inserting budget:', insertError)
        }
      }

      // Create bills for subscriptions
      if (subscriptions.length > 0) {
        // Find or create Subscriptions category
        let subscriptionCategoryId: string | null = null
        const existingSubCat = existingCategories.find(
          c => c.name.toLowerCase() === 'subscriptions'
        )

        if (existingSubCat) {
          subscriptionCategoryId = existingSubCat.id
        } else {
          const { data: newCat } = await supabase
            .from('categories')
            .select()
            .eq('user_id', user.id)
            .eq('name', 'Subscriptions')
            .single()

          if (newCat) {
            subscriptionCategoryId = newCat.id
          }
        }

        if (subscriptionCategoryId) {
          for (const sub of subscriptions) {
            // Map frequency to bill frequency
            const billFrequency = sub.frequency === 'weekly' ? 'weekly'
              : sub.frequency === 'yearly' ? 'yearly'
              : 'monthly'

            // Calculate next due date (1st of next month for monthly, etc.)
            const today = new Date()
            const nextDue = new Date(today.getFullYear(), today.getMonth() + 1, 1)

            // Check if bill already exists with same name
            const { data: existingBill } = await supabase
              .from('bills')
              .select('id')
              .eq('user_id', user.id)
              .eq('name', sub.name)
              .single()

            if (!existingBill) {
              await supabase.from('bills').insert({
                user_id: user.id,
                name: sub.name,
                amount: sub.amount,
                frequency: billFrequency,
                due_day: 1,
                next_due: nextDue.toISOString().split('T')[0],
                category_id: subscriptionCategoryId,
                is_active: true,
              })
            }
          }
        }
      }

      // Create savings category and allocation if there's money left
      if (remaining > 0) {
        let savingsCategoryId: string | null = null
        const existingSavings = existingCategories.find(
          c => c.name.toLowerCase().includes('saving')
        )

        if (existingSavings) {
          savingsCategoryId = existingSavings.id
        } else {
          const { data: newCat, error: savingsError } = await supabase
            .from('categories')
            .insert({
              user_id: user.id,
              name: 'Savings',
              icon: 'piggy-bank',
              color: '#10b981',
              type: 'expense',
              sort_order: 99,
            })
            .select()
            .single()

          if (savingsError) {
            console.error('Error creating savings category:', savingsError)
          }
          if (newCat) {
            savingsCategoryId = newCat.id
          }
        }

        if (savingsCategoryId) {
          await supabase
            .from('budgets')
            .delete()
            .eq('user_id', user.id)
            .eq('category_id', savingsCategoryId)
            .eq('month', currentMonth)

          const { error: savingsInsertError } = await supabase
            .from('budgets')
            .insert({
              user_id: user.id,
              category_id: savingsCategoryId,
              month: currentMonth,
              allocated: remaining,
            })

          if (savingsInsertError) {
            console.error('Error inserting savings budget:', savingsInsertError)
          }
        }
      }

      onComplete()
      router.refresh()
    } catch (error) {
      console.error('Error saving budget:', error)
    } finally {
      setSaving(false)
    }
  }

  // Leftover money allocation step
  if (isQuestionsComplete && showLeftoverStep && remaining > 0) {
    const leftoverRemaining = remaining - leftoverAllocated

    return (
      <div className="space-y-6">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Almost done!</span>
            <span>{formatCurrency(leftoverRemaining)} to allocate</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sprout-500 transition-all duration-300"
              style={{ width: `${(leftoverAllocated / remaining) * 100}%` }}
            />
          </div>
        </div>

        {/* Header */}
        <div className="card bg-gradient-to-br from-sprout-50 to-bloom-50">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-white/50 flex items-center justify-center mx-auto mb-3">
              <PiggyBank className="w-7 h-7 text-sprout-600" />
            </div>
            <h2 className="font-display text-xl font-bold text-gray-900 mb-2">
              You have {formatCurrency(remaining)} left over!
            </h2>
            <p className="text-sm text-gray-600">
              That&apos;s great news! Let&apos;s decide what to do with it. You can split it between different options or put it all in one place.
            </p>
          </div>
        </div>

        {/* Allocation options */}
        <div className="space-y-4">
          {LEFTOVER_OPTIONS.map((option) => {
            const allocated = leftoverAllocations[option.id] || 0
            const isSelected = allocated > 0

            return (
              <div
                key={option.id}
                className={`card transition-all ${isSelected ? 'ring-2 ring-sprout-400 ring-offset-2' : ''}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{option.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{option.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                    <p className="text-xs text-sprout-600 mt-2 italic">{option.tip}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        max={remaining}
                        value={allocated || ''}
                        onChange={(e) => handleLeftoverChange(option.id, e.target.value)}
                        placeholder="0"
                        className="input pl-7 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleLeftoverQuickAllocate(option.id)}
                    className="px-3 py-2 text-xs font-medium bg-gray-100 hover:bg-sprout-100 text-gray-600 hover:text-sprout-700 rounded-lg transition-colors"
                  >
                    All here
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Unallocated warning */}
        {leftoverRemaining > 0 && (
          <div className="p-3 bg-amber-50 rounded-xl text-sm text-amber-700">
            <strong>Heads up:</strong> You still have {formatCurrency(leftoverRemaining)} to allocate. Any unallocated amount will go into general savings.
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          <button onClick={handleLeftoverBack} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleLeftoverNext}
            className="btn-primary flex-1"
          >
            Continue to Summary
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Summary & recommendations step
  if (isQuestionsComplete) {
    // Generate insights based on their spending
    const insights: string[] = []

    // Fixed vs variable analysis
    const fixedPercent = totalIncome > 0 ? (totalFixed / totalIncome) * 100 : 0

    if (fixedPercent > 50) {
      insights.push(`Your fixed expenses (rent, utilities, transport, subscriptions) take up ${fixedPercent.toFixed(0)}% of your income. This is quite high - ideally fixed costs should be under 50%.`)
    } else {
      insights.push(`Your fixed expenses are ${fixedPercent.toFixed(0)}% of your income, which is healthy.`)
    }

    // Dining analysis
    if (answers.dining && answers.dining > 300) {
      insights.push(`You spend ${formatCurrency(answers.dining)} on dining out. Cooking just 2 more meals at home each week could save you around ${formatCurrency(answers.dining * 0.3)}/month.`)
    }

    // Subscriptions check
    if (answers.subscriptions && answers.subscriptions > 150) {
      insights.push(`Your subscriptions total ${formatCurrency(answers.subscriptions)}. It's worth reviewing these annually - most people have 1-2 subscriptions they forgot about.`)
    }

    // Savings rate analysis - use rounded value for consistency
    const displaySavingsRate = Math.round(savingsRate)
    if (remaining > 0) {
      if (displaySavingsRate >= 20) {
        insights.push(`You're saving ${displaySavingsRate}% of your income (${formatCurrency(remaining)}). This is excellent - financial experts recommend saving at least 20%.`)
      } else if (displaySavingsRate >= 10) {
        insights.push(`You're saving ${displaySavingsRate}% of your income (${formatCurrency(remaining)}). This is a good start - aim to build towards 20% over time.`)
      } else if (displaySavingsRate > 0) {
        insights.push(`You're saving ${displaySavingsRate}% of your income (${formatCurrency(remaining)}). Consider ways to reduce variable expenses to boost your savings rate.`)
      }
    } else if (remaining < 0) {
      insights.push(`Your expenses exceed your income by ${formatCurrency(Math.abs(remaining))}. You'll need to reduce spending in some categories to balance your budget.`)
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-sprout-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-sprout-600" />
          </div>
          <h2 className="font-display text-2xl font-bold text-gray-900">
            Your Budget Plan
          </h2>
          <p className="text-gray-500 mt-1">
            Here&apos;s how we&apos;ve allocated your money
          </p>
        </div>

        {/* Summary card */}
        <div className="card bg-gradient-to-br from-sprout-50 to-bloom-50">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Monthly Income</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalIncome)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAllocated)}</p>
            </div>
          </div>

          <div className="h-3 bg-white rounded-full overflow-hidden mb-4">
            <div
              className={`h-full rounded-full transition-all ${
                remaining >= 0 ? 'bg-sprout-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min((totalAllocated / totalIncome) * 100, 100)}%` }}
            />
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-white/50">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-sprout-600" />
              <span className="font-medium text-gray-700">
                {remaining >= 0 ? 'Monthly Savings' : 'Over Budget'}
              </span>
            </div>
            <span className={`text-xl font-bold ${remaining >= 0 ? 'text-sprout-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(remaining))}
            </span>
          </div>
        </div>

        {/* Our analysis */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-bloom-500" />
            <h3 className="font-semibold text-gray-900">Our Analysis</h3>
          </div>

          <div className="space-y-3">
            {insights.map((insight, i) => (
              <p key={i} className="text-sm text-gray-600 leading-relaxed">
                {insight}
              </p>
            ))}
          </div>
        </div>

        {/* Breakdown */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Your Allocations</h3>
          <div className="space-y-2">
            {BUDGET_QUESTIONS.filter(q => answers[q.id] > 0).map(q => (
              <div key={q.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: q.color }}
                  />
                  <span className="text-gray-600">{q.category}</span>
                </div>
                <span className="font-medium text-gray-900">{formatCurrency(answers[q.id])}</span>
              </div>
            ))}
            {remaining > 0 && (
              <>
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Leftover Money</p>
                </div>
                {leftoverAllocated > 0 ? (
                  <>
                    {LEFTOVER_OPTIONS.filter(opt => leftoverAllocations[opt.id] > 0).map(opt => (
                      <div key={opt.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span>{opt.icon}</span>
                          <span className="text-gray-600">{opt.name}</span>
                        </div>
                        <span className="font-medium text-gray-900">{formatCurrency(leftoverAllocations[opt.id])}</span>
                      </div>
                    ))}
                    {remaining - leftoverAllocated > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-sprout-500" />
                          <span className="text-sprout-600 font-medium">Unallocated Savings</span>
                        </div>
                        <span className="font-bold text-sprout-600">{formatCurrency(remaining - leftoverAllocated)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-sprout-500" />
                      <span className="text-sprout-600 font-medium">Savings</span>
                    </div>
                    <span className="font-bold text-sprout-600">{formatCurrency(remaining)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (remaining > 0) {
                setShowLeftoverStep(true)
              } else {
                handleBack()
              }
            }}
            className="btn-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1"
          >
            {saving ? 'Saving...' : 'Save My Budget'}
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Subscription step - special UI
  if (isSubscriptionStep) {
    return (
      <div className="space-y-6">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Question {currentStep + 1} of {BUDGET_QUESTIONS.length}</span>
            <span>{formatCurrency(remaining)} left</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-bloom-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Subscription header */}
        <div className="card">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: `${currentQuestion.color}20` }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: currentQuestion.color }}
            >
              <span className="text-white text-sm">$</span>
            </div>
          </div>
          <h2 className="font-display text-lg font-bold text-gray-900 text-center mb-2">
            What subscriptions do you pay for?
          </h2>
          <p className="text-sm text-gray-500 text-center mb-4">
            Add each subscription below. We&apos;ll calculate your monthly total.
          </p>

          {/* Current subscriptions list */}
          {subscriptions.length > 0 && (
            <div className="space-y-2 mb-4">
              {subscriptions.map((sub) => {
                const freq = SUBSCRIPTION_FREQUENCIES.find(f => f.id === sub.frequency)
                const monthly = Math.round(sub.amount * (freq?.multiplier || 1))
                return (
                  <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">{sub.name}</p>
                      <p className="text-xs text-gray-500">
                        ${sub.amount} {sub.frequency} = {formatCurrency(monthly)}/mo
                      </p>
                    </div>
                    <button
                      onClick={() => removeSubscription(sub.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="font-medium text-gray-700">Monthly Total</span>
                <span className="font-bold text-teal-600">{formatCurrency(subscriptionMonthlyTotal)}</span>
              </div>
            </div>
          )}

          {/* Add subscription */}
          <div>
            <div className="space-y-3">
              <input
                type="text"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                placeholder="Subscription name"
                className="input"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <CurrencyInput
                    value={newSubAmount}
                    onChange={setNewSubAmount}
                    placeholder="Amount"
                  />
                </div>
                <select
                  value={newSubFrequency}
                  onChange={(e) => setNewSubFrequency(e.target.value as SubscriptionFrequency)}
                  className="input w-28"
                >
                  {SUBSCRIPTION_FREQUENCIES.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAddCustomSubscription}
                disabled={!newSubName.trim() || !newSubAmount}
                className="w-full py-2 px-3 rounded-xl text-sm font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Subscription
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStep > 0 ? (
            <button onClick={handleBack} className="btn-secondary">
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
          )}

          <button
            onClick={handleSkip}
            className="btn-ghost flex-1"
          >
            Skip
          </button>

          <button
            onClick={handleNext}
            className="btn-primary flex-1"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Question step - clean, no tips
  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Question {currentStep + 1} of {BUDGET_QUESTIONS.length}</span>
          <span>{formatCurrency(remaining)} left</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-bloom-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="card text-center py-8">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: `${currentQuestion.color}20` }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: currentQuestion.color }}
          >
            <span className="text-white text-lg">$</span>
          </div>
        </div>

        <h2 className="font-display text-xl font-bold text-gray-900 mb-6">
          {currentQuestion.question}
        </h2>

        {/* Time frame selector */}
        <div className="flex justify-center gap-1 mb-4 p-1 bg-gray-100 rounded-full max-w-xs mx-auto">
          {TIME_FRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setCurrentTimeFrame(tf.id)}
              className={`flex-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                currentTimeFrame === tf.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Amount input */}
        <div className="max-w-xs mx-auto mb-4">
          <CurrencyInput
            value={currentAmount}
            onChange={setCurrentAmount}
            placeholder="0"
            autoFocus
          />
        </div>

        {/* Quick amounts - clean round numbers for each time frame */}
        <div className="flex flex-wrap justify-center gap-2">
          {currentQuestion.quickAmounts[currentTimeFrame].map(amount => (
            <button
              key={amount}
              onClick={() => setCurrentAmount(amount.toString())}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                currentAmount === amount.toString()
                  ? 'bg-bloom-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ${amount}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {currentStep > 0 ? (
          <button onClick={handleBack} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}

        <button
          onClick={handleSkip}
          className="btn-ghost flex-1"
        >
          Skip
        </button>

        <button
          onClick={handleNext}
          className="btn-primary flex-1"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
