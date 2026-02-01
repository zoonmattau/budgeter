import { createClient } from '@/lib/supabase/server'
import { LeaderboardClient } from '@/components/leaderboard/leaderboard-client'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get user preferences
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Get friends leaderboard
  const { data: friendsLeaderboard } = await supabase
    .rpc('get_friends_leaderboard', { p_user_id: user.id })

  // Get global leaderboard
  const { data: globalLeaderboard } = await supabase
    .rpc('get_global_leaderboard', { p_limit: 100 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Social</h1>
        <p className="text-gray-500 text-sm mt-1">Compare net worth with friends and the world</p>
      </div>

      <LeaderboardClient
        currentUserId={user.id}
        preferences={preferences}
        friendsLeaderboard={friendsLeaderboard || []}
        globalLeaderboard={globalLeaderboard || []}
      />
    </div>
  )
}
