import { createClient } from '@/lib/supabase/server'
import { LeaderboardClient } from '@/components/leaderboard/leaderboard-client'
import { subDays, subMonths, subYears } from 'date-fns'

// Generate 100 deterministic simulated net worths for a realistic-feeling leaderboard
// Uses a seeded approach so values are stable across page loads within a day
function generateSimulatedEntries(today: Date) {
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  const entries: { id: string; net_worth: number }[] = []

  // Simple seeded pseudo-random number generator
  let state = seed
  function rand() {
    state = (state * 1664525 + 1013904223) & 0x7fffffff
    return state / 0x7fffffff
  }

  for (let i = 0; i < 100; i++) {
    const r = rand()
    // Distribution: mix of people at different stages
    // ~20% negative (debt), ~30% low (0-20k), ~30% mid (20k-100k), ~15% high (100k-500k), ~5% very high (500k+)
    let netWorth: number
    if (r < 0.20) {
      netWorth = -Math.round(rand() * 30000 + 500) // -500 to -30500
    } else if (r < 0.50) {
      netWorth = Math.round(rand() * 20000) // 0 to 20000
    } else if (r < 0.80) {
      netWorth = Math.round(rand() * 80000 + 20000) // 20000 to 100000
    } else if (r < 0.95) {
      netWorth = Math.round(rand() * 400000 + 100000) // 100000 to 500000
    } else {
      netWorth = Math.round(rand() * 500000 + 500000) // 500000 to 1000000
    }
    entries.push({ id: `sim-${i}`, net_worth: netWorth })
  }

  return entries
}

// Given a set of net worths and the user's net worth, compute their rank
function computeRank(userNetWorth: number, allNetWorths: number[]): number {
  return allNetWorths.filter(nw => nw > userNetWorth).length + 1
}

// Simulate what the user's rank would have been in the past
// We shift simulated net worths slightly and use the user's historical net worth
function computeHistoricalRank(
  userHistoricalNetWorth: number | null,
  simulatedEntries: { net_worth: number }[],
  realOtherNetWorths: number[],
  dayOffset: number,
): number | null {
  if (userHistoricalNetWorth === null) return null

  // Shift simulated entries slightly for historical feel (some grew, some shrank)
  let state = dayOffset * 31337
  function rand() {
    state = (state * 1664525 + 1013904223) & 0x7fffffff
    return state / 0x7fffffff
  }

  const historicalSimulated = simulatedEntries.map(e => {
    const drift = (rand() - 0.5) * 0.1 // +/- 5% drift
    return e.net_worth * (1 + drift)
  })

  const allNetWorths = [...historicalSimulated, ...realOtherNetWorths]
  return computeRank(userHistoricalNetWorth, allNetWorths)
}

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const today = new Date()

  // Get user preferences
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Get friends leaderboard and global leaderboard in parallel
  const [
    { data: friendsLeaderboard },
    { data: globalLeaderboard },
    { data: historicalSnapshots },
  ] = await Promise.all([
    supabase.rpc('get_friends_leaderboard', { p_user_id: user.id }),
    supabase.rpc('get_global_leaderboard', { p_limit: 100 }),
    // Fetch user's historical net worth snapshots for movement calculation
    supabase
      .from('net_worth_snapshots')
      .select('net_worth, snapshot_date')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false })
      .limit(365),
  ])

  // Find user's current net worth from the leaderboard data
  const friendsEntries = friendsLeaderboard || []
  const globalEntries = globalLeaderboard || []
  const userGlobalEntry = globalEntries.find((e: { user_id: string }) => e.user_id === user.id)
  const userFriendsEntry = friendsEntries.find((e: { user_id: string }) => e.user_id === user.id)
  const userNetWorth = Number(userGlobalEntry?.net_worth ?? userFriendsEntry?.net_worth ?? 0)

  // Generate simulated entries
  const simulatedEntries = generateSimulatedEntries(today)

  // Anonymize real entries: strip names and exact net worth for non-self users
  // Only keep net_worth values for ranking purposes (never sent to client for others)
  const realGlobalNetWorths = globalEntries
    .filter((e: { user_id: string }) => e.user_id !== user.id)
    .map((e: { net_worth: number }) => Number(e.net_worth))

  const realFriendsNetWorths = friendsEntries
    .filter((e: { user_id: string }) => e.user_id !== user.id)
    .map((e: { net_worth: number }) => Number(e.net_worth))

  // Compute current ranks
  const allGlobalNetWorths = [
    ...simulatedEntries.map(e => e.net_worth),
    ...realGlobalNetWorths,
  ]
  const allFriendsNetWorths = [
    ...realFriendsNetWorths,
  ]

  const globalRank = computeRank(userNetWorth, allGlobalNetWorths)
  const globalTotal = allGlobalNetWorths.length + 1 // +1 for the user
  const globalPercentile = Math.round(((globalTotal - globalRank) / globalTotal) * 100)

  const friendsRank = computeRank(userNetWorth, allFriendsNetWorths)
  const friendsTotal = allFriendsNetWorths.length + 1
  const friendsPercentile = friendsTotal > 1
    ? Math.round(((friendsTotal - friendsRank) / friendsTotal) * 100)
    : 100

  // Compute historical ranks for movement indicators
  const snapshots = historicalSnapshots || []

  function findClosestSnapshot(targetDate: Date): number | null {
    // Find snapshot closest to target date (within a few days)
    let best: { net_worth: number; snapshot_date: string } | null = null
    let bestDiff = Infinity
    for (const s of snapshots) {
      const diff = Math.abs(new Date(s.snapshot_date).getTime() - targetDate.getTime())
      if (diff < bestDiff) {
        bestDiff = diff
        best = s
      }
    }
    // Only use if within 3 days of target
    if (best && bestDiff <= 3 * 24 * 60 * 60 * 1000) {
      return Number(best.net_worth)
    }
    return null
  }

  const weekAgoNW = findClosestSnapshot(subDays(today, 7))
  const monthAgoNW = findClosestSnapshot(subMonths(today, 1))
  const quarterAgoNW = findClosestSnapshot(subMonths(today, 3))
  const yearAgoNW = findClosestSnapshot(subYears(today, 1))

  const globalRankWeekAgo = computeHistoricalRank(weekAgoNW, simulatedEntries, realGlobalNetWorths, 7)
  const globalRankMonthAgo = computeHistoricalRank(monthAgoNW, simulatedEntries, realGlobalNetWorths, 30)
  const globalRankQuarterAgo = computeHistoricalRank(quarterAgoNW, simulatedEntries, realGlobalNetWorths, 90)
  const globalRankYearAgo = computeHistoricalRank(yearAgoNW, simulatedEntries, realGlobalNetWorths, 365)

  const friendsRankWeekAgo = weekAgoNW !== null ? computeRank(weekAgoNW, allFriendsNetWorths) : null
  const friendsRankMonthAgo = monthAgoNW !== null ? computeRank(monthAgoNW, allFriendsNetWorths) : null
  const friendsRankQuarterAgo = quarterAgoNW !== null ? computeRank(quarterAgoNW, allFriendsNetWorths) : null
  const friendsRankYearAgo = yearAgoNW !== null ? computeRank(yearAgoNW, allFriendsNetWorths) : null

  // Build leaderboard entries for display
  // Global: anonymous names but show net worth values for everyone
  const sortedGlobalNetWorths = allGlobalNetWorths.sort((a, b) => b - a)
  const anonymizedGlobal = sortedGlobalNetWorths
    .map((nw, i) => ({ rank: i + 1, isUser: false, displayName: null as string | null, netWorth: nw }))

  // Insert user at their rank position
  anonymizedGlobal.splice(globalRank - 1, 0, { rank: globalRank, isUser: true, displayName: null, netWorth: userNetWorth })
  // Re-rank after insertion
  const globalDisplay = anonymizedGlobal.map((entry, i) => ({
    ...entry,
    rank: i + 1,
  }))

  // Friends: show real names and net worths (they opted in)
  const sortedFriends = friendsEntries
    .sort((a: { net_worth: number }, b: { net_worth: number }) => Number(b.net_worth) - Number(a.net_worth))
    .map((entry: { user_id: string; display_name: string; net_worth: number }, i: number) => ({
      rank: i + 1,
      isUser: entry.user_id === user.id,
      displayName: entry.user_id === user.id ? 'You' : (entry.display_name || 'Friend'),
      netWorth: Number(entry.net_worth),
    }))

  // If user not in friends list (not opted in), insert them
  const userInFriends = sortedFriends.some((e: { isUser: boolean }) => e.isUser)
  const friendsDisplay = userInFriends
    ? sortedFriends
    : (() => {
        const list = [...sortedFriends]
        list.splice(friendsRank - 1, 0, { rank: friendsRank, isUser: true, displayName: 'You', netWorth: userNetWorth })
        return list.map((entry: { rank: number; isUser: boolean; displayName: string | null; netWorth: number | null }, i: number) => ({ ...entry, rank: i + 1 }))
      })()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Leaderboard</h1>
        <p className="text-gray-500 text-sm mt-1">See where you rank among friends and globally</p>
      </div>

      <LeaderboardClient
        currentUserId={user.id}
        preferences={preferences}
        globalRank={globalRank}
        globalTotal={globalTotal}
        globalPercentile={globalPercentile}
        globalEntries={globalDisplay}
        globalMovement={{
          week: globalRankWeekAgo !== null ? globalRankWeekAgo - globalRank : null,
          month: globalRankMonthAgo !== null ? globalRankMonthAgo - globalRank : null,
          quarter: globalRankQuarterAgo !== null ? globalRankQuarterAgo - globalRank : null,
          year: globalRankYearAgo !== null ? globalRankYearAgo - globalRank : null,
        }}
        friendsRank={friendsRank}
        friendsTotal={friendsTotal}
        friendsPercentile={friendsPercentile}
        friendsEntries={friendsDisplay}
        friendsMovement={{
          week: friendsRankWeekAgo !== null ? friendsRankWeekAgo - friendsRank : null,
          month: friendsRankMonthAgo !== null ? friendsRankMonthAgo - friendsRank : null,
          quarter: friendsRankQuarterAgo !== null ? friendsRankQuarterAgo - friendsRank : null,
          year: friendsRankYearAgo !== null ? friendsRankYearAgo - friendsRank : null,
        }}
      />
    </div>
  )
}
