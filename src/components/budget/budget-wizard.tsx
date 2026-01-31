'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Sparkles, Lightbulb, PiggyBank, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CurrencyInput } from '@/components/ui/currency-input'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/database.types'

// Time frame options with conversion to monthly
const TIME_FRAMES = [
  { id: 'week', label: 'Per week', multiplier: 52 / 12 },
  { id: 'fortnight', label: 'Per fortnight', multiplier: 26 / 12 },
  { id: 'month', label: 'Per month', multiplier: 1 },
] as const

type TimeFrame = typeof TIME_FRAMES[number]['id']

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

  const supabase = createClient()

  const currentQuestion = BUDGET_QUESTIONS[currentStep]
  const isQuestionsComplete = currentStep >= BUDGET_QUESTIONS.length
  const progress = (currentStep / BUDGET_QUESTIONS.length) * 100

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
    const rawAmount = parseFloat(currentAmount) || 0
    // Convert to monthly amount
    const timeFrame = TIME_FRAMES.find(t => t.id === currentTimeFrame)
    const monthlyAmount = Math.round(rawAmount * (timeFrame?.multiplier || 1))
    if (currentQuestion) {
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: monthlyAmount }))
    }
    setCurrentAmount('')
    setCurrentTimeFrame('month')
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
    setCurrentAmount('')
    setCurrentTimeFrame('month')
    setCurrentStep(prev => prev + 1)
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

  // Summary & recommendations step
  if (isQuestionsComplete) {
    // Generate insights based on their spending
    const insights: string[] = []

    // Fixed vs variable analysis
    const fixedPercent = totalIncome > 0 ? (totalFixed / totalIncome) * 100 : 0
    const variablePercent = totalIncome > 0 ? (totalVariable / totalIncome) * 100 : 0

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
              <div className="flex justify-between items-center py-2 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-sprout-500" />
                  <span className="text-sprout-600 font-medium">Savings</span>
                </div>
                <span className="font-bold text-sprout-600">{formatCurrency(remaining)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={handleBack} className="btn-secondary">
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
