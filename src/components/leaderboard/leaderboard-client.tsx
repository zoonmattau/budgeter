'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trophy, Users, Globe, Medal, UserPlus, TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown } from 'lucide-react'

interface LeaderboardEntry {
  rank: number
  isUser: boolean
  displayName: string | null
  netWorth: number | null
}

interface Movement {
  week: number | null
  month: number | null
  quarter: number | null
  year: number | null
}

interface LeaderboardClientProps {
  currentUserId: string
  preferences: {
    friends_leaderboard_visible: boolean
    global_leaderboard_visible: boolean
  } | null
  globalRank: number
  globalTotal: number
  globalPercentile: number
  globalEntries: LeaderboardEntry[]
  globalMovement: Movement
  friendsRank: number
  friendsTotal: number
  friendsPercentile: number
  friendsEntries: LeaderboardEntry[]
  friendsMovement: Movement
}

type Tab = 'global' | 'friends'

export function LeaderboardClient({
  currentUserId,
  preferences,
  globalRank,
  globalTotal,
  globalPercentile,
  globalEntries,
  globalMovement,
  friendsRank,
  friendsTotal,
  friendsPercentile,
  friendsEntries,
  friendsMovement,
}: LeaderboardClientProps) {
  const [tab, setTab] = useState<Tab>('global')

  const rank = tab === 'global' ? globalRank : friendsRank
  const total = tab === 'global' ? globalTotal : friendsTotal
  const percentile = tab === 'global' ? globalPercentile : friendsPercentile
  const entries = tab === 'global' ? globalEntries : friendsEntries
  const movement = tab === 'global' ? globalMovement : friendsMovement
  const isOptedIn = tab === 'friends'
    ? preferences?.friends_leaderboard_visible
    : preferences?.global_leaderboard_visible

  // Show entries around the user's position (window of ~15 entries)
  const windowSize = 7
  const userIndex = entries.findIndex(e => e.isUser)
  const startIndex = Math.max(0, userIndex - windowSize)
  const endIndex = Math.min(entries.length, userIndex + windowSize + 1)
  const visibleEntries = entries.slice(startIndex, endIndex)
  const showTopEntries = startIndex > 0
  const showBottomGap = endIndex < entries.length

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
            You are not visible on the {tab} leaderboard.{' '}
            <Link href="/settings" className="underline font-medium hover:text-amber-900">Go to Settings</Link> to opt in.
          </p>
        </div>
      )}

      {/* Position Card */}
      <div className="card bg-gradient-to-br from-bloom-50 to-lavender-50 border border-bloom-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-bloom-400 to-bloom-600 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">#{rank}</p>
              <p className="text-sm text-gray-500">of {total}</p>
            </div>
            <p className="text-sm text-bloom-600 font-medium">Top {percentile > 0 ? `${100 - percentile}%` : '1%'}</p>
          </div>
        </div>

        {/* Percentile Bar */}
        <div className="mb-4">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-bloom-400 to-sprout-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(percentile, 2)}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-white border-2 border-bloom-500 rounded-full shadow-sm"
              style={{ left: `${Math.max(Math.min(percentile, 98), 2)}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-gray-400">Top</span>
            <span className="text-[10px] text-gray-400">Bottom</span>
          </div>
        </div>

        {/* Movement Indicators */}
        <div className="grid grid-cols-4 gap-2">
          <MovementCard label="1 week" places={movement.week} />
          <MovementCard label="1 month" places={movement.month} />
          <MovementCard label="3 months" places={movement.quarter} />
          <MovementCard label="1 year" places={movement.year} />
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-500">
            {tab === 'global' ? 'Global Rankings' : 'Friends Rankings'}
          </h3>
          <span className="text-xs text-gray-400">{total} participants</span>
        </div>

        {entries.length === 0 ? (
          <div className="py-8 text-center">
            <Trophy className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {tab === 'friends'
                ? 'No friends have opted in yet'
                : 'No users on the leaderboard yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Top 3 always visible */}
            {showTopEntries && (
              <>
                {entries.slice(0, 3).map((entry) => (
                  <LeaderboardRow key={`top-${entry.rank}`} entry={entry} />
                ))}
                {startIndex > 3 && (
                  <div className="flex items-center justify-center py-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <ChevronDown className="w-3 h-3" />
                      <span>{startIndex - 3} more</span>
                      <ChevronDown className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Window around user */}
            {visibleEntries.map((entry) => {
              // Skip top 3 if already shown
              if (showTopEntries && entry.rank <= 3) return null
              return <LeaderboardRow key={entry.rank} entry={entry} />
            })}

            {/* Bottom gap indicator */}
            {showBottomGap && (
              <div className="flex items-center justify-center py-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <ChevronDown className="w-3 h-3" />
                  <span>{entries.length - endIndex} more below</span>
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MovementCard({ label, places }: { label: string; places: number | null }) {
  if (places === null) {
    return (
      <div className="p-2 bg-white/50 rounded-lg text-center">
        <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
        <p className="text-xs text-gray-300 font-medium">--</p>
      </div>
    )
  }

  const isUp = places > 0
  const isDown = places < 0
  const isFlat = places === 0

  return (
    <div className="p-2 bg-white/50 rounded-lg text-center">
      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
      <div className="flex items-center justify-center gap-0.5">
        {isUp && <TrendingUp className="w-3 h-3 text-sprout-500" />}
        {isDown && <TrendingDown className="w-3 h-3 text-red-500" />}
        {isFlat && <Minus className="w-3 h-3 text-gray-400" />}
        <span className={`text-sm font-bold ${
          isUp ? 'text-sprout-600' : isDown ? 'text-red-600' : 'text-gray-500'
        }`}>
          {isFlat ? '0' : `${isUp ? '+' : ''}${places}`}
        </span>
      </div>
    </div>
  )
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
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

  const formattedNetWorth = entry.netWorth !== null
    ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(entry.netWorth)
    : null

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
        entry.isUser ? 'bg-bloom-50 ring-1 ring-bloom-200' : 'hover:bg-gray-50'
      }`}
    >
      {/* Rank */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${rankStyle.bg} ${rankStyle.text}`}
      >
        {entry.rank <= 3 ? (
          <Medal className={`w-4 h-4 ${rankStyle.icon}`} />
        ) : (
          entry.rank
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${entry.isUser ? 'text-bloom-700' : entry.displayName ? 'text-gray-700' : 'text-gray-400'}`}>
          {entry.isUser ? 'You' : (entry.displayName || `User #${entry.rank}`)}
        </p>
      </div>

      {/* Net worth */}
      <div className="flex items-center">
        {formattedNetWorth ? (
          <span className={`text-sm font-semibold ${
            entry.isUser ? 'text-bloom-600' :
            entry.netWorth !== null && entry.netWorth < 0 ? 'text-red-500' : 'text-gray-600'
          }`}>
            {formattedNetWorth}
          </span>
        ) : (
          <span className="text-xs text-gray-300">***</span>
        )}
      </div>
    </div>
  )
}
