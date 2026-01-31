'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

type Step = 'welcome' | 'income' | 'goal' | 'complete'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('welcome')
  const [income, setIncome] = useState('')
  const [incomeSource, setIncomeSource] = useState('Salary')
  const [goalName, setGoalName] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleComplete() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const currentMonth = new Date().toISOString().slice(0, 8) + '01'

    // Save income if provided
    if (income) {
      await supabase.from('income_entries').insert({
        user_id: user.id,
        month: currentMonth,
        source: incomeSource,
        amount: parseFloat(income),
        is_recurring: true,
      })
    }

    // Create goal if provided
    if (goalName && goalAmount) {
      await supabase.from('goals').insert({
        user_id: user.id,
        name: goalName,
        target_amount: parseFloat(goalAmount),
        icon: 'target',
        color: '#d946ef',
        visual_type: 'plant',
      })
    }

    // Mark onboarding complete
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id)

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {(['welcome', 'income', 'goal', 'complete'] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-all ${
              step === s
                ? 'w-6 bg-bloom-500'
                : i < ['welcome', 'income', 'goal', 'complete'].indexOf(step)
                ? 'bg-bloom-300'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1">
        {step === 'welcome' && (
          <WelcomeStep onNext={() => setStep('income')} />
        )}

        {step === 'income' && (
          <IncomeStep
            income={income}
            setIncome={setIncome}
            incomeSource={incomeSource}
            setIncomeSource={setIncomeSource}
            onBack={() => setStep('welcome')}
            onNext={() => setStep('goal')}
          />
        )}

        {step === 'goal' && (
          <GoalStep
            goalName={goalName}
            setGoalName={setGoalName}
            goalAmount={goalAmount}
            setGoalAmount={setGoalAmount}
            onBack={() => setStep('income')}
            onNext={() => setStep('complete')}
          />
        )}

        {step === 'complete' && (
          <CompleteStep
            income={income}
            goalName={goalName}
            goalAmount={goalAmount}
            onBack={() => setStep('goal')}
            onComplete={handleComplete}
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-bloom-100 to-sprout-100 flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-12 h-12 text-bloom-500" />
      </div>

      <h1 className="font-display text-3xl font-bold text-gray-900 mb-3">
        Welcome to Bloom
      </h1>

      <p className="text-gray-600 mb-8 max-w-sm mx-auto">
        Let&apos;s set up your budget in just a few steps. We&apos;ll help you give every dollar a job.
      </p>

      <div className="space-y-3 text-left max-w-xs mx-auto mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sprout-100 flex items-center justify-center text-sprout-600 font-semibold text-sm">1</div>
          <p className="text-gray-700">Set your monthly income</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sprout-100 flex items-center justify-center text-sprout-600 font-semibold text-sm">2</div>
          <p className="text-gray-700">Create your first savings goal</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sprout-100 flex items-center justify-center text-sprout-600 font-semibold text-sm">3</div>
          <p className="text-gray-700">Start budgeting!</p>
        </div>
      </div>

      <button onClick={onNext} className="btn-primary w-full">
        Get Started
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function IncomeStep({
  income,
  setIncome,
  incomeSource,
  setIncomeSource,
  onBack,
  onNext,
}: {
  income: string
  setIncome: (v: string) => void
  incomeSource: string
  setIncomeSource: (v: string) => void
  onBack: () => void
  onNext: () => void
}) {
  const sources = ['Salary', 'Freelance', 'Business', 'Other']

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
        What&apos;s your monthly income?
      </h1>
      <p className="text-gray-500 mb-6">
        Enter your take-home pay (after tax). You can add more income sources later.
      </p>

      <div className="space-y-5 mb-8">
        <div>
          <label className="label">Amount (after tax)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xl">$</span>
            <input
              type="number"
              min="0"
              step="100"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="5,000"
              className="input pl-10 text-2xl font-bold h-16"
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="label">Income source</label>
          <div className="grid grid-cols-2 gap-2">
            {sources.map((source) => (
              <button
                key={source}
                type="button"
                onClick={() => setIncomeSource(source)}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  incomeSource === source
                    ? 'border-bloom-500 bg-bloom-50 text-bloom-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {source}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button onClick={onNext} className="btn-primary flex-1">
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function GoalStep({
  goalName,
  setGoalName,
  goalAmount,
  setGoalAmount,
  onBack,
  onNext,
}: {
  goalName: string
  setGoalName: (v: string) => void
  goalAmount: string
  setGoalAmount: (v: string) => void
  onBack: () => void
  onNext: () => void
}) {
  const suggestions = [
    { name: 'Emergency Fund', amount: '10000' },
    { name: 'Holiday', amount: '5000' },
    { name: 'New Phone', amount: '1500' },
  ]

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
        What are you saving for?
      </h1>
      <p className="text-gray-500 mb-6">
        Set your first goal and watch your savings bloom!
      </p>

      {/* Quick suggestions */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4">
        {suggestions.map((s) => (
          <button
            key={s.name}
            onClick={() => {
              setGoalName(s.name)
              setGoalAmount(s.amount)
            }}
            className={`px-4 py-2 rounded-full border whitespace-nowrap text-sm transition-all ${
              goalName === s.name
                ? 'border-bloom-500 bg-bloom-50 text-bloom-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="space-y-5 mb-8">
        <div>
          <label className="label">Goal name</label>
          <input
            type="text"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            placeholder="e.g., Holiday to Bali"
            className="input"
          />
        </div>

        <div>
          <label className="label">Target amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xl">$</span>
            <input
              type="number"
              min="0"
              step="100"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              placeholder="5,000"
              className="input pl-10 text-2xl font-bold h-16"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button onClick={onNext} className="btn-primary flex-1">
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={onNext}
        className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-4"
      >
        Skip for now
      </button>
    </div>
  )
}

function CompleteStep({
  income,
  goalName,
  goalAmount,
  onBack,
  onComplete,
  loading,
}: {
  income: string
  goalName: string
  goalAmount: string
  onBack: () => void
  onComplete: () => void
  loading: boolean
}) {
  return (
    <div className="text-center">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sprout-100 to-bloom-100 flex items-center justify-center mx-auto mb-6">
        <svg className="w-12 h-12 text-sprout-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
        You&apos;re all set!
      </h1>
      <p className="text-gray-500 mb-8">
        Here&apos;s a summary of your setup. Ready to start budgeting?
      </p>

      <div className="card text-left mb-8">
        {income && (
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <span className="text-gray-600">Monthly Income</span>
            <span className="font-semibold text-sprout-600">{formatCurrency(parseFloat(income))}</span>
          </div>
        )}
        {goalName && goalAmount && (
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-600">First Goal</span>
            <div className="text-right">
              <p className="font-medium text-gray-900">{goalName}</p>
              <p className="text-sm text-bloom-600">{formatCurrency(parseFloat(goalAmount))}</p>
            </div>
          </div>
        )}
        {!income && !goalName && (
          <p className="text-gray-400 text-center py-4">No data added yet - that&apos;s okay!</p>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button onClick={onComplete} disabled={loading} className="btn-primary flex-1">
          {loading ? 'Setting up...' : 'Start Budgeting'}
          <Sparkles className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
