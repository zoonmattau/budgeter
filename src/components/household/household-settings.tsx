'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, Users, UserPlus, LogOut, Crown, Plus, Share2, Info, Link, Mail, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/database.types'

interface HouseholdInvitation {
  id: string
  invited_email: string
  status: string
  created_at: string
}

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
  const [copiedLink, setCopiedLink] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [householdName, setHouseholdName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newInviteCode, setNewInviteCode] = useState<string | null>(null)

  // Email invitation state
  const [inviteEmail, setInviteEmail] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [pendingInvitations, setPendingInvitations] = useState<HouseholdInvitation[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(false)
  const [deletingInvitationId, setDeletingInvitationId] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch pending invitations
  useEffect(() => {
    if (membership?.household_id && membership.role === 'owner') {
      fetchPendingInvitations()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membership?.household_id, membership?.role])

  async function fetchPendingInvitations() {
    if (!membership?.household_id) return
    setLoadingInvitations(true)
    try {
      const response = await fetch(`/api/households/invitations?householdId=${membership.household_id}`)
      if (response.ok) {
        const data = await response.json()
        setPendingInvitations(data.invitations || [])
      }
    } catch (err) {
      console.error('Failed to fetch invitations:', err)
    }
    setLoadingInvitations(false)
  }

  async function handleCopy() {
    if (!membership?.households?.invite_code) return
    await navigator.clipboard.writeText(membership.households.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCopyLink() {
    if (!membership?.households?.invite_code) return
    const inviteUrl = `${window.location.origin}/join/${membership.households.invite_code}`
    await navigator.clipboard.writeText(inviteUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  async function handleShare() {
    if (!membership?.households?.invite_code || !membership.households.name) return
    const inviteUrl = `${window.location.origin}/join/${membership.households.invite_code}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${membership.households.name}`,
          text: `You've been invited to join ${membership.households.name} on Seedling!`,
          url: inviteUrl,
        })
      } catch {
        // User cancelled or share failed - fall back to copy
        handleCopyLink()
      }
    } else {
      // No Web Share API - copy to clipboard
      handleCopyLink()
    }
  }

  async function handleSendEmailInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim() || !membership?.household_id) return

    setSendingInvite(true)
    setInviteError(null)
    setInviteSuccess(false)

    try {
      const response = await fetch('/api/households/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId: membership.household_id,
          email: inviteEmail.trim().toLowerCase(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setInviteError(data.error || 'Failed to send invitation')
        setSendingInvite(false)
        return
      }

      setInviteSuccess(true)
      setInviteEmail('')
      fetchPendingInvitations()
      setTimeout(() => setInviteSuccess(false), 3000)
    } catch {
      setInviteError('Failed to send invitation')
    }
    setSendingInvite(false)
  }

  async function handleCancelInvitation(invitationId: string) {
    setDeletingInvitationId(invitationId)
    try {
      const response = await fetch(`/api/households/invitations/${invitationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      }
    } catch (err) {
      console.error('Failed to cancel invitation:', err)
    }
    setDeletingInvitationId(null)
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

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLeaving(false)
      return
    }

    // Remove membership
    const { error: memberError } = await supabase
      .from('household_members')
      .delete()
      .eq('user_id', user.id)
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

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setJoining(false)
      return
    }

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

    // Check if already a member
    const { data: existingMembership } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', household.id)
      .eq('user_id', user.id)
      .single()

    if (existingMembership) {
      setError('You are already a member of this household')
      setJoining(false)
      return
    }

    // Add as member
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: user.id,
        role: 'member',
      })

    if (memberError) {
      setError(memberError.message)
      setJoining(false)
      return
    }

    window.location.reload()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!householdName.trim()) return

    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/households', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: householdName.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create household')
        setCreating(false)
        return
      }

      setNewInviteCode(data.inviteCode)
      setCreating(false)
    } catch {
      setError('Failed to create household')
      setCreating(false)
    }
  }

  // Show success screen after creating household
  if (newInviteCode) {
    return (
      <div className="space-y-4">
        <div className="card text-center py-6">
          <div className="w-16 h-16 rounded-full bg-sprout-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-sprout-600" />
          </div>
          <h3 className="font-display font-semibold text-gray-900 mb-2">Household Created!</h3>
          <p className="text-sm text-gray-500 mb-6">Share this code to invite others:</p>

          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <span className="font-mono text-2xl font-bold text-gray-900 tracking-wider">
              {newInviteCode}
            </span>
          </div>

          <button
            onClick={async () => {
              await navigator.clipboard.writeText(newInviteCode)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className="btn-secondary mb-4"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>

          <button
            onClick={() => window.location.reload()}
            className="btn-primary w-full"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // No household - show options to create or join
  if (!membership) {
    return (
      <div className="space-y-4">
        {/* Info box explaining households */}
        <div className="bg-bloom-50 rounded-xl p-4 flex gap-3">
          <Info className="w-5 h-5 text-bloom-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-bloom-800">
            <p className="font-medium mb-1">What is a Household?</p>
            <p className="text-bloom-700">
              A household lets you share specific budgets, goals, and accounts with others.
              Only items you choose to share will be visible - your private data stays private.
            </p>
          </div>
        </div>

        {/* Create Household Form */}
        {showCreateForm ? (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Create Household</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <input
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="Household name (e.g., Smith Family)"
                className="input"
                maxLength={50}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setError(null)
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !householdName.trim()}
                  className="btn-primary flex-1"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        ) : showJoinForm ? (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Join Household</h3>
            <form onSubmit={handleJoin} className="space-y-3">
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 8-character invite code"
                className="input font-mono uppercase text-center tracking-widest"
                maxLength={8}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinForm(false)
                    setError(null)
                  }}
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
          </div>
        ) : (
          <>
            {/* Create option */}
            <div className="card">
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-full bg-bloom-100 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-6 h-6 text-bloom-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Create a Household</p>
                  <p className="text-sm text-gray-500">Start a new household and invite others</p>
                </div>
              </button>
            </div>

            {/* Join option */}
            <div className="card">
              <button
                onClick={() => setShowJoinForm(true)}
                className="w-full flex items-center gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-full bg-sprout-100 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-6 h-6 text-sprout-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Join a Household</p>
                  <p className="text-sm text-gray-500">Enter an invite code from someone else</p>
                </div>
              </button>
            </div>
          </>
        )}
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

        {/* Share link */}
        {household?.invite_code && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 uppercase font-medium mb-2">Share Link</p>
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 btn-secondary text-sm"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4" />
                    Copy Link
                  </>
                )}
              </button>
              <button
                onClick={handleShare}
                className="btn-primary text-sm"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Anyone with this link can join your household
            </p>
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

      {/* Email invitations - only for owners */}
      {isOwner && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-bloom-600" />
            <h3 className="font-semibold text-gray-900">Invite by Email</h3>
          </div>

          <form onSubmit={handleSendEmailInvite} className="space-y-3">
            {inviteError && (
              <p className="text-sm text-red-600">{inviteError}</p>
            )}
            {inviteSuccess && (
              <p className="text-sm text-sprout-600">Invitation sent!</p>
            )}
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
                className="input flex-1"
              />
              <button
                type="submit"
                disabled={sendingInvite || !inviteEmail.trim()}
                className="btn-primary"
              >
                {sendingInvite ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Send'
                )}
              </button>
            </div>
          </form>

          {/* Pending invitations */}
          {pendingInvitations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase font-medium mb-2">Pending Invitations</p>
              <div className="space-y-2">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{invitation.invited_email}</span>
                    </div>
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      disabled={deletingInvitationId === invitation.id}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Cancel invitation"
                    >
                      {deletingInvitationId === invitation.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingInvitations && pendingInvitations.length === 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          )}
        </div>
      )}

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
