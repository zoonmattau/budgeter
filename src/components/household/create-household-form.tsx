'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Copy, Check, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ContributionSetup } from './contribution-setup'

interface CreateHouseholdFormProps {
  onBack: () => void
  onComplete: (householdId: string) => void
}

type Step = 'create' | 'invite' | 'contribution'

export function CreateHouseholdForm({ onBack, onComplete }: CreateHouseholdFormProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState<Step>('create')

  const supabase = createClient()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      // Generate a random 8-character invite code
      const code = generateInviteCode()

      // Create household
      const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({
          name: name.trim(),
          created_by: user.id,
          invite_code: code,
        })
        .select()
        .single()

      if (householdError) {
        setError(householdError.message)
        setLoading(false)
        return
      }

      // Add user as owner
      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: user.id,
          role: 'owner',
        })

      if (memberError) {
        setError(memberError.message)
        setLoading(false)
        return
      }

      // Show invite code step
      setInviteCode(code)
      setHouseholdId(household.id)
      setStep('invite')
    } catch (err) {
      setError('An unexpected error occurred')
    }

    setLoading(false)
  }

  function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  async function handleCopy() {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Show contribution setup step
  if (step === 'contribution' && householdId) {
    return (
      <ContributionSetup
        householdId={householdId}
        householdName={name}
        onComplete={() => onComplete(householdId)}
      />
    )
  }

  // Show success screen with invite code
  if (step === 'invite' && inviteCode && householdId) {
    return (
      <div>
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-sprout-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-sprout-600" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
            Household created!
          </h1>
          <p className="text-gray-500">
            Share this invite code with others to join <strong>{name}</strong>
          </p>
        </div>

        {/* Invite code display */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <p className="text-xs text-gray-400 uppercase font-medium mb-2 text-center">
            Invite Code
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-3xl font-bold text-gray-900 tracking-wider">
              {inviteCode}
            </span>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              {copied ? (
                <Check className="w-5 h-5 text-sprout-600" />
              ) : (
                <Copy className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-400 text-center mb-6">
          You can also find this code in your household settings later.
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
        Create your household
      </h1>
      <p className="text-gray-500 mb-6">
        Give your household a name. You can invite others after.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate}>
        <div className="mb-6">
          <label className="label">Household name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., The Smith Family"
            className="input"
            autoFocus
            required
          />
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onBack} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn-primary flex-1"
          >
            {loading ? 'Creating...' : 'Create Household'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
