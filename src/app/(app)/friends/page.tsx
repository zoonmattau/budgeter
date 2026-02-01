import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { FriendsClient } from '@/components/friends/friends-client'

export default async function FriendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's profile with friend code
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, friend_code')
    .eq('id', user.id)
    .single()

  // Get pending friend requests (where user is addressee)
  const { data: rawPendingRequests } = await supabase
    .from('friendships')
    .select('id, requester_id, created_at')
    .eq('addressee_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // Get requester profiles for pending requests
  const pendingRequesterIds = rawPendingRequests?.map(r => r.requester_id) || []
  let pendingRequests: { id: string; requester_id: string; created_at: string; profiles: { display_name: string | null } | null }[] = []
  if (pendingRequesterIds.length > 0) {
    const { data: requesterProfiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', pendingRequesterIds)

    pendingRequests = (rawPendingRequests || []).map(r => ({
      ...r,
      profiles: requesterProfiles?.find(p => p.id === r.requester_id) || null
    }))
  }

  // Get all accepted friendships
  const { data: friendships } = await supabase
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted')

  // Get friend profiles
  const friendIds = friendships?.map(f =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  ) || []

  let friends: { id: string; display_name: string | null }[] = []
  if (friendIds.length > 0) {
    const { data: friendProfiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', friendIds)
    friends = friendProfiles || []
  }

  // Get sent pending requests
  const { data: rawSentRequests } = await supabase
    .from('friendships')
    .select('id, addressee_id, created_at')
    .eq('requester_id', user.id)
    .eq('status', 'pending')

  // Get addressee profiles for sent requests
  const sentAddresseeIds = rawSentRequests?.map(r => r.addressee_id) || []
  let sentRequests: { id: string; addressee_id: string; created_at: string; profiles: { display_name: string | null } | null }[] = []
  if (sentAddresseeIds.length > 0) {
    const { data: addresseeProfiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', sentAddresseeIds)

    sentRequests = (rawSentRequests || []).map(r => ({
      ...r,
      profiles: addresseeProfiles?.find(p => p.id === r.addressee_id) || null
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/leaderboard" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Manage Friends</h1>
          <p className="text-gray-500 text-sm mt-1">Share your code and add friends</p>
        </div>
      </div>

      <FriendsClient
        profile={profile}
        currentUserId={user.id}
        pendingRequests={pendingRequests || []}
        sentRequests={sentRequests || []}
        friends={friends}
      />
    </div>
  )
}
