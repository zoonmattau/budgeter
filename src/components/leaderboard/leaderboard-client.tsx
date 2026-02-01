'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trophy, Users, Globe, Medal, UserPlus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LeaderboardEntry {
  user_id: string
  display_name: string | null
  net_worth: number
  rank: number
}

interface LeaderboardClientProps {
  currentUserId: string
  preferences: {
    friends_leaderboard_visible: boolean
    global_leaderboard_visible: boolean
  } | null
  friendsLeaderboard: LeaderboardEntry[]
  globalLeaderboard: LeaderboardEntry[]
}

type Tab = 'global' | 'friends'

export function LeaderboardClient({
  currentUserId,
  preferences,
  friendsLeaderboard,
  globalLeaderboard,
}: LeaderboardClientProps) {
  const [tab, setTab] = useState<Tab>('global')

  const leaderboard = tab === 'friends' ? friendsLeaderboard : globalLeaderboard
  const isOptedIn = tab === 'friends'
    ? preferences?.friends_leaderboard_visible
    : preferences?.global_leaderboard_visible

  return (
    <div className="space-y-4">
      {/* Tab Selector */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setTab('global')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            tab === 'global'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Globe className="w-4 h-4" />
          Global
        </button>
        <button
          onClick={() => setTab('friends')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            tab === 'friends'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Friends
        </button>
      </div>

      {/* Manage Friends Link */}
      <Link
        href="/friends"
        className="flex items-center justify-between p-3 bg-bloom-50 rounded-xl hover:bg-bloom-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-bloom-600" />
          <span className="text-sm font-medium text-bloom-700">Add & manage friends</span>
        </div>
        <span className="text-xs text-bloom-500">Your code & requests</span>
      </Link>

      {/* Not opted in warning */}
      {!isOptedIn && (
        <div className="card bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">
            You are not visible on the {tab} leaderboard.
            Go to Settings to opt in.
          </p>
        </div>
      )}

      {/* Leaderboard */}
      <div className="card">
        {leaderboard.length === 0 ? (
          <div className="py-8 text-center">
            <Trophy className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {tab === 'friends'
                ? 'No friends have opted in yet'
                : 'No users on the leaderboard yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry) => (
              <LeaderboardRow
                key={entry.user_id}
                entry={entry}
                isCurrentUser={entry.user_id === currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry
  isCurrentUser: boolean
}) {
  const rankColors: Record<number, { bg: string; text: string; icon: string }> = {
    1: { bg: 'bg-amber-100', text: 'text-amber-600', icon: 'text-amber-500' },
    2: { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'text-gray-400' },
    3: { bg: 'bg-orange-100', text: 'text-orange-600', icon: 'text-orange-400' },
  }

  const rankStyle = rankColors[entry.rank] || {
    bg: 'bg-gray-50',
    text: 'text-gray-500',
    icon: '',
  }

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
        isCurrentUser ? 'bg-bloom-50 ring-1 ring-bloom-200' : 'hover:bg-gray-50'
      }`}
    >
      {/* Rank */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${rankStyle.bg} ${rankStyle.text}`}
      >
        {entry.rank <= 3 ? (
          <Medal className={`w-5 h-5 ${rankStyle.icon}`} />
        ) : (
          entry.rank
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${isCurrentUser ? 'text-bloom-700' : 'text-gray-900'}`}>
          {entry.display_name || 'Anonymous'}
          {isCurrentUser && (
            <span className="text-xs text-bloom-500 ml-1">(you)</span>
          )}
        </p>
      </div>

      {/* Net Worth */}
      <p className={`font-bold ${entry.net_worth >= 0 ? 'text-sprout-600' : 'text-red-600'}`}>
        {formatCurrency(entry.net_worth)}
      </p>
    </div>
  )
}
