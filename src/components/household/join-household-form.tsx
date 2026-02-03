'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ContributionSetup } from './contribution-setup'

interface JoinHouseholdFormProps {
  onBack: () => void
  onComplete: (householdId: string) => void
}

type Step = 'join' | 'success' | 'contribution'

export function JoinHouseholdForm({ onBack, onComplete }: JoinHouseholdFormProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [householdName, setHouseholdName] = useState<string | null>(null)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('join')

  const supabase = createClient()

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setError(null)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      // Look up household by invite code
      const { data: household, error: householdError } = await supabase
        .from('households')
        .select('*')
        .eq('invite_code', code.trim().toUpperCase())
        .single()

      if (householdError || !household) {
        setError('Invalid invite code. Please check and try again.')
        setLoading(false)
        return
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', household.id)
        .eq('user_id', user.id)
        .single()

      if (existingMember) {
        setError('You are already a member of this household.')
        setLoading(false)
        return
      }

      // Add user as member
      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: user.id,
          role: 'member',
        })

      if (memberError) {
        setError(memberError.message)
        setLoading(false)
        return
      }

      // Show success step
      setHouseholdName(household.name)
      setHouseholdId(household.id)
      setStep('success')
    } catch {
      setError('An unexpected error occurred')
    }

    setLoading(false)
  }

  // Format input to uppercase and add visual spacing
  function handleCodeChange(value: string) {
    // Remove non-alphanumeric and convert to uppercase
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    setCode(cleaned.slice(0, 8))
  }

  // Show contribution setup step
  if (step === 'contribution' && householdId && householdName) {
    return (
      <ContributionSetup
        householdId={householdId}
        householdName={householdName}
        onComplete={() => onComplete(householdId)}
      />
    )
  }

  // Show success screen
  if (step === 'success' && householdName && householdId) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-sprout-100 flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-sprout-600" />
        </div>
        <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
          You&apos;ve joined!
        </h1>
        <p className="text-gray-500 mb-8">
          Welcome to <strong>{householdName}</strong>. You can now share budgets and track spending together.
        </p>

        <button
          onClick={() => setStep('contribution')}
          className="btn-primary w-full"
        >
          Next: Set Your Contribution
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
        Join a household
      </h1>
      <p className="text-gray-500 mb-6">
        Enter the invite code you received from the household owner.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleJoin}>
        <div className="mb-6">
          <label className="label">Invite code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="ABCD1234"
            className="input text-center font-mono text-2xl tracking-wider uppercase"
            autoFocus
            maxLength={8}
            required
          />
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onBack} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={loading || code.length < 8}
            className="btn-primary flex-1"
          >
            {loading ? 'Joining...' : 'Join Household'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
