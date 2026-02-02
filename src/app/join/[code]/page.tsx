'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, UserPlus, Check, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { storeInviteCode, clearStoredInviteCode } from '@/lib/invitations'

interface HouseholdPreview {
  id: string
  name: string
  memberCount: number
}

import { use } from 'react'

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [household, setHousehold] = useState<HouseholdPreview | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAlreadyMember, setIsAlreadyMember] = useState(false)

  const supabase = createClient()
  const code = resolvedParams.code.toUpperCase()

  useEffect(() => {
    async function checkStatus() {
      setLoading(true)
      setError(null)

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)

      // Look up household by invite code
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .select('id, name')
        .eq('invite_code', code)
        .single()

      if (householdError || !householdData) {
        setError('Invalid invite code. Please check the link and try again.')
        setLoading(false)
        return
      }

      // Get member count
      const { count } = await supabase
        .from('household_members')
        .select('*', { count: 'exact', head: true })
        .eq('household_id', householdData.id)

      setHousehold({
        id: householdData.id,
        name: householdData.name,
        memberCount: count || 0,
      })

      // If logged in, check if already a member
      if (user) {
        const { data: membership } = await supabase
          .from('household_members')
          .select('id')
          .eq('household_id', householdData.id)
          .eq('user_id', user.id)
          .single()

        if (membership) {
          setIsAlreadyMember(true)
        }
      } else {
        // Not logged in - store invite code for after signup
        storeInviteCode(code, householdData.name)
      }

      setLoading(false)
    }

    checkStatus()
  }, [code, supabase])

  async function handleJoin() {
    if (!household) return

    setJoining(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
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
      if (memberError.code === '23505') {
        setError('You are already a member of this household')
      } else {
        setError(memberError.message)
      }
      setJoining(false)
      return
    }

    // Clear any stored invite code
    clearStoredInviteCode()

    setSuccess(true)
    setJoining(false)

    // Redirect to dashboard after a short delay
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 1500)
  }

  function handleSignupRedirect() {
    // Store the invite code before redirecting
    if (household) {
      storeInviteCode(code, household.name)
    }
    router.push(`/signup?invite=${code}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-bloom-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-bloom-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !household) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-bloom-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="font-display text-xl font-semibold text-gray-900 mb-2">
              Invalid Invitation
            </h1>
            <p className="text-gray-500 mb-6">{error}</p>
            <Link href="/" className="btn-primary inline-flex">
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-bloom-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card text-center">
            <div className="w-16 h-16 rounded-full bg-sprout-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-sprout-600" />
            </div>
            <h1 className="font-display text-xl font-semibold text-gray-900 mb-2">
              Welcome to {household?.name}!
            </h1>
            <p className="text-gray-500 mb-4">
              You&apos;ve successfully joined the household.
            </p>
            <p className="text-sm text-gray-400">Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-bloom-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card">
          {/* Household info */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-bloom-100 flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-bloom-600" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Join {household?.name}
            </h1>
            <p className="text-gray-500">
              You&apos;ve been invited to join this household
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {household?.memberCount} {household?.memberCount === 1 ? 'member' : 'members'}
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Already a member */}
          {isAlreadyMember && (
            <div className="text-center">
              <div className="p-4 rounded-xl bg-sprout-50 mb-4">
                <Check className="w-6 h-6 text-sprout-600 mx-auto mb-2" />
                <p className="text-sprout-700 font-medium">You&apos;re already a member!</p>
              </div>
              <Link href="/dashboard" className="btn-primary w-full">
                Go to Dashboard
              </Link>
            </div>
          )}

          {/* Logged in - show join button */}
          {isLoggedIn && !isAlreadyMember && (
            <div>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="btn-primary w-full mb-4"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Join Household
                  </>
                )}
              </button>
              <Link
                href="/dashboard"
                className="block text-center text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </Link>
            </div>
          )}

          {/* Not logged in - prompt to sign up or login */}
          {!isLoggedIn && (
            <div>
              <p className="text-sm text-gray-600 text-center mb-4">
                Create an account to join this household
              </p>
              <button
                onClick={handleSignupRedirect}
                className="btn-primary w-full mb-3"
              >
                <UserPlus className="w-4 h-4" />
                Create Account
              </button>
              <Link
                href={`/login?redirectTo=/join/${code}`}
                className="btn-secondary w-full"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Invite code: <span className="font-mono">{code}</span>
        </p>
      </div>
    </div>
  )
}
