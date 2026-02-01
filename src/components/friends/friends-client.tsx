'use client'

import { useState } from 'react'
import { Copy, Check, UserPlus, Users, Clock, X, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FriendsClientProps {
  profile: {
    id: string
    display_name: string | null
    friend_code: string | null
  } | null
  currentUserId: string
  pendingRequests: {
    id: string
    requester_id: string
    created_at: string
    profiles: { display_name: string | null } | null
  }[]
  sentRequests: {
    id: string
    addressee_id: string
    created_at: string
    profiles: { display_name: string | null } | null
  }[]
  friends: {
    id: string
    display_name: string | null
  }[]
}

export function FriendsClient({
  profile,
  currentUserId,
  pendingRequests,
  sentRequests,
  friends,
}: FriendsClientProps) {
  const [copied, setCopied] = useState(false)
  const [friendCode, setFriendCode] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const supabase = createClient()

  async function handleCopy() {
    if (!profile?.friend_code) return
    await navigator.clipboard.writeText(profile.friend_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault()
    if (!friendCode.trim()) return

    setAdding(true)
    setError(null)
    setSuccess(null)

    // Look up user by friend code
    const { data: foundUsers, error: lookupError } = await supabase
      .rpc('get_user_by_friend_code', { p_code: friendCode.trim().toUpperCase() })

    const foundUser = foundUsers?.[0] as { id: string; display_name: string } | undefined

    if (lookupError || !foundUser) {
      setError('No user found with that code')
      setAdding(false)
      return
    }

    if (foundUser.id === currentUserId) {
      setError("You can't add yourself as a friend")
      setAdding(false)
      return
    }

    // Check if already friends or pending
    const { data: existing } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${foundUser.id}),and(requester_id.eq.${foundUser.id},addressee_id.eq.${currentUserId})`)
      .single()

    if (existing) {
      if (existing.status === 'accepted') {
        setError('You are already friends')
      } else if (existing.status === 'pending') {
        setError('Friend request already pending')
      } else {
        setError('Cannot send request to this user')
      }
      setAdding(false)
      return
    }

    // Create friend request
    const { error: insertError } = await supabase
      .from('friendships')
      .insert({
        requester_id: currentUserId,
        addressee_id: foundUser.id,
        status: 'pending',
      })

    if (insertError) {
      setError('Failed to send request')
      setAdding(false)
      return
    }

    setSuccess(`Friend request sent to ${foundUser.display_name || 'user'}!`)
    setFriendCode('')
    setAdding(false)

    // Refresh the page to show the new sent request
    window.location.reload()
  }

  async function handleAccept(requestId: string) {
    if (processingId) return
    setProcessingId(requestId)

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId)

    if (!error) {
      window.location.reload()
    } else {
      setProcessingId(null)
    }
  }

  async function handleReject(requestId: string) {
    if (processingId) return
    setProcessingId(requestId)

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId)

    if (!error) {
      window.location.reload()
    } else {
      setProcessingId(null)
    }
  }

  async function handleCancelRequest(requestId: string) {
    if (processingId) return
    setProcessingId(requestId)

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId)

    if (!error) {
      window.location.reload()
    } else {
      setProcessingId(null)
    }
  }

  async function handleRemoveFriend(friendId: string) {
    if (processingId) return

    const confirmed = window.confirm('Are you sure you want to remove this friend?')
    if (!confirmed) return

    setProcessingId(friendId)

    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${currentUserId})`)

    if (!error) {
      window.location.reload()
    } else {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Your Friend Code */}
      <div className="card">
        <h2 className="font-display font-semibold text-gray-900 mb-3">Your Friend Code</h2>
        <p className="text-sm text-gray-500 mb-3">Share this code with friends to let them add you</p>

        {profile?.friend_code && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xl font-bold text-gray-900 tracking-wider">
                {profile.friend_code}
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
      </div>

      {/* Add Friend */}
      <div className="card">
        <h2 className="font-display font-semibold text-gray-900 mb-3">Add Friend</h2>
        <form onSubmit={handleAddFriend} className="space-y-3">
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {success && (
            <p className="text-sm text-sprout-600">{success}</p>
          )}
          <input
            type="text"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
            placeholder="Enter friend code"
            className="input font-mono uppercase"
            maxLength={8}
          />
          <button
            type="submit"
            disabled={adding || friendCode.length < 8}
            className="btn-primary w-full"
          >
            <UserPlus className="w-4 h-4" />
            {adding ? 'Sending...' : 'Send Friend Request'}
          </button>
        </form>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="card">
          <h2 className="font-display font-semibold text-gray-900 mb-3">
            Friend Requests ({pendingRequests.length})
          </h2>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-bloom-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-bloom-600">
                      {(request.profiles?.display_name || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {request.profiles?.display_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(request.id)}
                    disabled={processingId !== null}
                    className="p-2 rounded-lg bg-sprout-100 text-sprout-600 hover:bg-sprout-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={processingId !== null}
                    className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent Requests */}
      {sentRequests.length > 0 && (
        <div className="card">
          <h2 className="font-display font-semibold text-gray-900 mb-3">
            Sent Requests ({sentRequests.length})
          </h2>
          <div className="space-y-3">
            {sentRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {request.profiles?.display_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-400">Pending</p>
                  </div>
                </div>
                <button
                  onClick={() => handleCancelRequest(request.id)}
                  disabled={processingId !== null}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === request.id ? 'Canceling...' : 'Cancel'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="card">
        <h2 className="font-display font-semibold text-gray-900 mb-3">
          <Users className="w-5 h-5 inline mr-2" />
          Friends ({friends.length})
        </h2>

        {friends.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">
            No friends yet. Add friends using their friend code!
          </p>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sprout-100 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-sprout-600" />
                  </div>
                  <p className="font-medium text-gray-900">
                    {friend.display_name || 'User'}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveFriend(friend.id)}
                  disabled={processingId !== null}
                  className="text-sm text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === friend.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
