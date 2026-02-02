'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { storeInviteCode, getStoredInviteCode, getStoredInviteHouseholdName } from '@/lib/invitations'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteHouseholdName, setInviteHouseholdName] = useState<string | null>(null)

  const supabase = createClient()

  // Check for invite code in URL or localStorage
  useEffect(() => {
    const urlInviteCode = searchParams.get('invite')
    if (urlInviteCode) {
      const code = urlInviteCode.toUpperCase()
      setInviteCode(code)
      // Fetch household name for the invite code
      async function fetchHouseholdName() {
        const { data } = await supabase
          .from('households')
          .select('name')
          .eq('invite_code', code)
          .single()
        if (data) {
          setInviteHouseholdName(data.name)
          storeInviteCode(code, data.name)
        }
      }
      fetchHouseholdName()
    } else {
      // Check localStorage for stored invite
      const storedCode = getStoredInviteCode()
      const storedName = getStoredInviteHouseholdName()
      if (storedCode) {
        setInviteCode(storedCode)
        setInviteHouseholdName(storedName)
      }
    }
  }, [searchParams, supabase])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Build callback URL with invite code if present
    const callbackUrl = new URL(`${window.location.origin}/auth/callback`)
    callbackUrl.searchParams.set('redirectTo', '/onboarding')
    if (inviteCode) {
      callbackUrl.searchParams.set('invite', inviteCode)
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
        emailRedirectTo: callbackUrl.toString(),
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/onboarding')
      router.refresh()
    }
  }

  return (
    <div className="card">
      <h2 className="font-display text-xl font-semibold text-center mb-2">Create your account</h2>
      <p className="text-gray-500 text-center text-sm mb-6">
        Start your journey to financial wellness
      </p>

      {/* Invite indicator */}
      {inviteCode && inviteHouseholdName && (
        <div className="mb-6 p-3 rounded-xl bg-bloom-50 border border-bloom-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-bloom-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-bloom-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-bloom-700">Joining {inviteHouseholdName}</p>
            <p className="text-xs text-bloom-600">You&apos;ll be added after signup</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label htmlFor="name" className="label">Name</label>
          <input
            id="name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="input"
            minLength={6}
            required
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-sprout-600 hover:text-sprout-700 font-medium">
          Sign in
        </Link>
      </p>

      <p className="text-center text-xs text-gray-400 mt-4">
        By creating an account, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
}

function SignupFallback() {
  return (
    <div className="card">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-2/3 mx-auto"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        <div className="space-y-3 mt-6">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupForm />
    </Suspense>
  )
}
