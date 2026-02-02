'use client'

import { useState } from 'react'
import { ArrowRight, Wallet, Calculator } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CurrencyInput } from '@/components/ui/currency-input'
import { formatCurrency } from '@/lib/utils'

interface ContributionSetupProps {
  householdId: string
  householdName: string
  onComplete: () => void
}

const frequencies = [
  { value: 'weekly', label: 'Weekly', multiplier: 4.33 },
  { value: 'fortnightly', label: 'Fortnightly', multiplier: 2.17 },
  { value: 'monthly', label: 'Monthly', multiplier: 1 },
]

export function ContributionSetup({ householdId, householdName, onComplete }: ContributionSetupProps) {
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Calculate monthly equivalent for display
  const parsedAmount = parseFloat(amount) || 0
  const selectedFreq = frequencies.find(f => f.value === frequency)
  const monthlyEquivalent = parsedAmount * (selectedFreq?.multiplier || 1)

  async function handleSave() {
    if (!amount || parsedAmount <= 0) {
      setError('Please enter a contribution amount')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      // Update the household_members record with contribution info
      const { error: updateError } = await supabase
        .from('household_members')
        .update({
          contribution_amount: parsedAmount,
          contribution_frequency: frequency,
        })
        .eq('household_id', householdId)
        .eq('user_id', user.id)

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      onComplete()
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  function handleSkip() {
    // Allow skipping - they can set it up later
    onComplete()
  }

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-bloom-100 flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-bloom-600" />
        </div>
        <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
          Set your contribution
        </h1>
        <p className="text-gray-500">
          How much do you want to contribute to <strong>{householdName}</strong>&apos;s shared budget?
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Amount input */}
        <div>
          <label className="label">Contribution amount</label>
          <CurrencyInput
            value={amount}
            onChange={setAmount}
            placeholder="500"
            autoFocus
          />
        </div>

        {/* Frequency selector */}
        <div>
          <label className="label">Frequency</label>
          <div className="grid grid-cols-3 gap-2">
            {frequencies.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFrequency(f.value)}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  frequency === f.value
                    ? 'border-bloom-500 bg-bloom-50 text-bloom-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Monthly equivalent display */}
        {parsedAmount > 0 && frequency !== 'monthly' && (
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <Calculator className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Monthly equivalent</p>
              <p className="font-semibold text-gray-900">{formatCurrency(monthlyEquivalent)}</p>
            </div>
          </div>
        )}

        {/* Info box */}
        <div className="p-4 bg-bloom-50 rounded-xl text-sm text-bloom-700">
          <p className="font-medium mb-1">How contributions work</p>
          <p className="text-bloom-600">
            Your contribution will appear as an expense in your personal budget and as income in your household budget.
            The combined contributions from all members determine how much your household can allocate.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleSkip}
            className="btn-secondary"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !amount}
            className="btn-primary flex-1"
          >
            {loading ? 'Saving...' : 'Save & Continue'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
