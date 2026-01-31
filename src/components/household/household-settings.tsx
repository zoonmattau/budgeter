'use client'

import { useState } from 'react'
import { Copy, Check, Users, UserPlus, LogOut, Crown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/database.types'

interface HouseholdSettingsProps {
  membership: {
    household_id: string
    role: 'owner' | 'member'
    households: Tables<'households'> | null
  } | null
  members: {
    user_id: string
    role: 'owner' | 'member'
    profiles: { display_name: string | null } | null
  }[]
  currentUserId: string
}

export function HouseholdSettings({ membership, members, currentUserId }: HouseholdSettingsProps) {
  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showJoinForm, setShowJoinForm] = useState(false)

  const supabase = createClient()

  async function handleCopy() {
    if (!membership?.households?.invite_code) return
    await navigator.clipboard.writeText(membership.households.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleLeave() {
    if (!membership) return

    const confirmed = window.confirm(
      membership.role === 'owner'
        ? 'As the owner, leaving will delete the household. Are you sure?'
        : 'Are you sure you want to leave this household?'
    )

    if (!confirmed) return

    setLeaving(true)

    // Remove membership
    const { error: memberError } = await supabase
      .from('household_members')
      .delete()
      .eq('user_id', currentUserId)
      .eq('household_id', membership.household_id)

    if (memberError) {
      setError(memberError.message)
      setLeaving(false)
      return
    }

    // If owner, delete the household
    if (membership.role === 'owner') {
      await supabase
        .from('households')
        .delete()
        .eq('id', membership.household_id)
    }

    window.location.reload()
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!joinCode.trim()) return

    setJoining(true)
    setError(null)

    // Look up household
    const { data: household, error: householdError } = await supabase
      .from('households')
      .select('*')
      .eq('invite_code', joinCode.trim().toUpperCase())
      .single()

    if (householdError || !household) {
      setError('Invalid invite code')
      setJoining(false)
      return
    }

    // Add as member
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: currentUserId,
        role: 'member',
      })

    if (memberError) {
      setError(memberError.message)
      setJoining(false)
      return
    }

    window.location.reload()
  }

  // No household - show options to create or join
  if (!membership) {
    return (
      <div className="space-y-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="font-medium text-gray-900">No household</p>
              <p className="text-sm text-gray-500">You&apos;re managing your budget solo</p>
            </div>
          </div>

          {showJoinForm ? (
            <form onSubmit={handleJoin} className="space-y-3">
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code"
                className="input font-mono uppercase"
                maxLength={8}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowJoinForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joining || joinCode.length < 8}
                  className="btn-primary flex-1"
                >
                  {joining ? 'Joining...' : 'Join'}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowJoinForm(true)}
              className="btn-secondary w-full"
            >
              <UserPlus className="w-4 h-4" />
              Join a Household
            </button>
          )}
        </div>
      </div>
    )
  }

  const household = membership.households
  const isOwner = membership.role === 'owner'

  return (
    <div className="space-y-4">
      {/* Household info */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-bloom-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-bloom-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{household?.name}</p>
            <p className="text-sm text-gray-500">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </p>
          </div>
        </div>

        {/* Invite code */}
        {household?.invite_code && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-xs text-gray-400 uppercase font-medium mb-1">Invite Code</p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-bold text-gray-900 tracking-wider">
                {household.invite_code}
              </span>
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-sprout-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Members list */}
        <div>
          <p className="text-xs text-gray-400 uppercase font-medium mb-2">Members</p>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {(member.profiles?.display_name || 'User').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-gray-900">
                    {member.profiles?.display_name || 'User'}
                    {member.user_id === currentUserId && (
                      <span className="text-gray-400 text-sm ml-1">(you)</span>
                    )}
                  </span>
                </div>
                {member.role === 'owner' && (
                  <Crown className="w-4 h-4 text-amber-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leave household */}
      <div className="card">
        {error && (
          <p className="text-sm text-red-600 mb-3">{error}</p>
        )}
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="w-full py-2 px-4 rounded-xl text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          {leaving ? 'Leaving...' : isOwner ? 'Delete Household' : 'Leave Household'}
        </button>
      </div>
    </div>
  )
}
