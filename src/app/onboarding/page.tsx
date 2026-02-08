'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, ArrowLeft, Sparkles, Phone, Users, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { CurrencyInput } from '@/components/ui/currency-input'
import { HouseholdStep } from '@/components/household/household-step'
import { clearStoredInviteCode } from '@/lib/invitations'

type Step = 'welcome' | 'income' | 'household' | 'goal' | 'complete'

const STEPS: Step[] = ['welcome', 'income', 'household', 'goal', 'complete']

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('welcome')
  const [displayName, setDisplayName] = useState('')
  const [mobile, setMobile] = useState('')
  const [income, setIncome] = useState('')
  const [incomeFrequency, setIncomeFrequency] = useState<'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [incomeSource, setIncomeSource] = useState('Salary')
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [preJoinedHouseholdName, setPreJoinedHouseholdName] = useState<string | null>(null)
  const [goalName, setGoalName] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Check for pre-joined household from invite flow
  useEffect(() => {
    const joinedHouseholdId = searchParams.get('joined')
    if (joinedHouseholdId) {
      setHouseholdId(joinedHouseholdId)
      // Clear any stored invite code
      clearStoredInviteCode()
      // Fetch household name
      async function fetchHouseholdName() {
        const { data } = await supabase
          .from('households')
          .select('name')
          .eq('id', joinedHouseholdId)
          .single()
        if (data) {
          setPreJoinedHouseholdName(data.name)
        }
      }
      fetchHouseholdName()
    }
  }, [searchParams, supabase])

  async function handleComplete() {
    setLoading(true)
    setError(null)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setError('Not authenticated. Please log in again.')
        setLoading(false)
        return
      }

      const currentMonth = new Date().toISOString().slice(0, 8) + '01'

      // Save income if provided
      if (income) {
        // Convert entered amount to monthly for storage
        const rawAmount = parseFloat(income)
        const monthlyAmount = incomeFrequency === 'weekly' ? rawAmount * 52 / 12
          : incomeFrequency === 'fortnightly' ? rawAmount * 26 / 12
          : incomeFrequency === 'quarterly' ? rawAmount / 3
          : incomeFrequency === 'yearly' ? rawAmount / 12
          : rawAmount

        const { error: incomeError } = await supabase.from('income_entries').insert({
          user_id: user.id,
          household_id: householdId,
          month: currentMonth,
          source: incomeSource,
          amount: Math.round(monthlyAmount * 100) / 100,
          is_recurring: true,
          pay_frequency: incomeFrequency,
        })
        if (incomeError) {
          console.error('Income save error:', incomeError)
          setError(`Failed to save income: ${incomeError.message}`)
          setLoading(false)
          return
        }
      }

      // Create goal if provided
      if (goalName && goalAmount) {
        const { error: goalError } = await supabase.from('goals').insert({
          user_id: user.id,
          household_id: householdId,
          name: goalName,
          target_amount: parseFloat(goalAmount),
          icon: 'target',
          color: '#d946ef',
          visual_type: 'plant',
        })
        if (goalError) {
          console.error('Goal save error:', goalError)
          setError(`Failed to save goal: ${goalError.message}`)
          setLoading(false)
          return
        }
      }

      // Update profile with name, mobile, and mark onboarding complete
      const profileUpdate: { onboarding_completed: boolean; display_name?: string; mobile?: string } = {
        onboarding_completed: true,
      }
      if (displayName) profileUpdate.display_name = displayName
      if (mobile) {
        // Format mobile number
        const formattedMobile = mobile.startsWith('+') ? mobile : `+61${mobile.replace(/^0/, '')}`
        profileUpdate.mobile = formattedMobile
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id)

      if (profileError) {
        console.error('Profile update error:', profileError)
        setError(`Failed to update profile: ${profileError.message}`)
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  function handleHouseholdComplete(hId: string | null) {
    setHouseholdId(hId)
    setStep('goal')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-all ${
              step === s
                ? 'w-6 bg-bloom-500'
                : i < STEPS.indexOf(step)
                ? 'bg-bloom-300'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="flex-1">
        {step === 'welcome' && (
          <WelcomeStep
            displayName={displayName}
            setDisplayName={setDisplayName}
            mobile={mobile}
            setMobile={setMobile}
            onNext={() => setStep('income')}
          />
        )}

        {step === 'income' && (
          <IncomeStep
            income={income}
            setIncome={setIncome}
            incomeFrequency={incomeFrequency}
            setIncomeFrequency={setIncomeFrequency}
            incomeSource={incomeSource}
            setIncomeSource={setIncomeSource}
            onBack={() => setStep('welcome')}
            onNext={() => setStep('household')}
          />
        )}

        {step === 'household' && (
          preJoinedHouseholdName ? (
            <PreJoinedHouseholdStep
              householdName={preJoinedHouseholdName}
              onBack={() => setStep('income')}
              onNext={() => setStep('goal')}
            />
          ) : (
            <HouseholdStep
              onBack={() => setStep('income')}
              onNext={handleHouseholdComplete}
            />
          )
        )}

        {step === 'goal' && (
          <GoalStep
            goalName={goalName}
            setGoalName={setGoalName}
            goalAmount={goalAmount}
            setGoalAmount={setGoalAmount}
            onBack={() => setStep('household')}
            onNext={() => setStep('complete')}
          />
        )}

        {step === 'complete' && (
          <CompleteStep
            income={income}
            incomeFrequency={incomeFrequency}
            goalName={goalName}
            goalAmount={goalAmount}
            householdId={householdId}
            onBack={() => setStep('goal')}
            onComplete={handleComplete}
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}

function WelcomeStep({
  displayName,
  setDisplayName,
  mobile,
  setMobile,
  onNext,
}: {
  displayName: string
  setDisplayName: (v: string) => void
  mobile: string
  setMobile: (v: string) => void
  onNext: () => void
}) {
  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-bloom-100 to-sprout-100 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-10 h-10 text-bloom-500" />
        </div>

        <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
          Welcome to Seedling
        </h1>

        <p className="text-gray-500 text-sm">
          Let&apos;s get you set up in just a few steps
        </p>
      </div>

      <div className="space-y-4 mb-8">
        <div>
          <label className="label">What should we call you?</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="input"
            autoFocus
          />
        </div>

        <div>
          <label className="label">Mobile number (for bank connection)</label>
          <div className="flex gap-2">
            <div className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-xl text-gray-600">
              <Phone className="w-4 h-4" />
              +61
            </div>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              placeholder="412 345 678"
              className="flex-1 input"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Optional - used when connecting your bank accounts later
          </p>
        </div>
      </div>

      <button onClick={onNext} className="btn-primary w-full">
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

type PayFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'

function IncomeStep({
  income,
  setIncome,
  incomeFrequency,
  setIncomeFrequency,
  incomeSource,
  setIncomeSource,
  onBack,
  onNext,
}: {
  income: string
  setIncome: (v: string) => void
  incomeFrequency: PayFrequency
  setIncomeFrequency: (v: PayFrequency) => void
  incomeSource: string
  setIncomeSource: (v: string) => void
  onBack: () => void
  onNext: () => void
}) {
  const sources = ['Salary', 'Freelance', 'Business', 'Other']
  const frequencies: { value: PayFrequency; label: string }[] = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'fortnightly', label: 'Fortnightly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
  ]

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
        What&apos;s your income?
      </h1>
      <p className="text-gray-500 mb-6">
        Enter your take-home pay (after tax). You can add more income sources later.
      </p>

      <div className="space-y-5 mb-8">
        <div>
          <label className="label">How often are you paid?</label>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {frequencies.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setIncomeFrequency(f.value)}
                className={`px-4 py-2 rounded-full border-2 text-sm font-medium whitespace-nowrap transition-all ${
                  incomeFrequency === f.value
                    ? 'border-bloom-500 bg-bloom-50 text-bloom-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Amount per {incomeFrequency === 'fortnightly' ? 'fortnight' : incomeFrequency === 'yearly' ? 'year' : incomeFrequency === 'quarterly' ? 'quarter' : incomeFrequency} (after tax)</label>
          <CurrencyInput
            value={income}
            onChange={setIncome}
            placeholder="5,000"
            autoFocus
          />
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
        Set your first goal and watch your savings grow!
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
          <CurrencyInput
            value={goalAmount}
            onChange={setGoalAmount}
            placeholder="5,000"
          />
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

function PreJoinedHouseholdStep({
  householdName,
  onBack,
  onNext,
}: {
  householdName: string
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-20 h-20 rounded-full bg-sprout-100 flex items-center justify-center mx-auto mb-4">
          <Check className="w-10 h-10 text-sprout-600" />
        </div>

        <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
          You&apos;ve joined {householdName}!
        </h1>

        <p className="text-gray-500 text-sm">
          You&apos;re now part of this household and can share budgets and goals with other members.
        </p>
      </div>

      <div className="card mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-bloom-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-bloom-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{householdName}</p>
            <p className="text-sm text-sprout-600">Successfully joined</p>
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

function CompleteStep({
  income,
  incomeFrequency,
  goalName,
  goalAmount,
  householdId,
  onBack,
  onComplete,
  loading,
}: {
  income: string
  incomeFrequency: PayFrequency
  goalName: string
  goalAmount: string
  householdId: string | null
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
            <span className="text-gray-600 capitalize">{incomeFrequency} Income</span>
            <span className="font-semibold text-sprout-600">{formatCurrency(parseFloat(income))}</span>
          </div>
        )}
        {householdId && (
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <span className="text-gray-600">Household</span>
            <span className="font-medium text-bloom-600">Set up</span>
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
        {!income && !goalName && !householdId && (
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
