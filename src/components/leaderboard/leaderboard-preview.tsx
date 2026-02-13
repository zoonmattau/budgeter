'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Globe, Users, Medal, ChevronRight, ChevronDown } from 'lucide-react'

interface LeaderboardEntry {
  rank: number
  isUser: boolean
  displayName: string | null
  netWorth: number | null
}

interface LeaderboardPreviewProps {
  globalRank: number
  globalTotal: number
  globalEntries: LeaderboardEntry[]
  friendsRank: number
  friendsTotal: number
  friendsEntries: LeaderboardEntry[]
}

export function LeaderboardPreview({
  globalRank,
  globalTotal,
  globalEntries,
  friendsRank,
  friendsTotal,
  friendsEntries,
}: LeaderboardPreviewProps) {
  const [tab, setTab] = useState<'global' | 'friends'>('global')

  const rank = tab === 'global' ? globalRank : friendsRank
  const total = tab === 'global' ? globalTotal : friendsTotal
  const entries = tab === 'global' ? globalEntries : friendsEntries

  // Show 2 entries above and below user
  const userIndex = entries.findIndex(e => e.isUser)
  const startIndex = Math.max(0, userIndex - 2)
  const endIndex = Math.min(entries.length, userIndex + 3)
  const visibleEntries = entries.slice(startIndex, endIndex)
  const hasAbove = startIndex > 0
  const hasBelow = endIndex < entries.length

  const formatNW = (nw: number | null) =>
    nw !== null
      ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(nw)
      : '***'

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-gray-900">Leaderboard</h2>
        <Link href="/leaderboard" className="text-sm text-bloom-600 hover:text-bloom-700 font-medium flex items-center gap-0.5">
          See all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-3">
        <button
          onClick={() => setTab('global')}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
            tab === 'global'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Global
        </button>
        <button
          onClick={() => setTab('friends')}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
            tab === 'friends'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Friends
        </button>
      </div>

      {/* Rank summary */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-sm text-gray-500">Your rank:</span>
        <span className="text-sm font-bold text-gray-900">#{rank}</span>
        <span className="text-xs text-gray-400">of {total}</span>
      </div>

      {/* Compact list */}
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-3">
          {tab === 'friends' ? 'No friends have opted in yet' : 'No entries yet'}
        </p>
      ) : (
        <div className="space-y-0.5">
          {hasAbove && (
            <div className="flex items-center justify-center py-0.5">
              <ChevronDown className="w-3 h-3 text-gray-300 rotate-180" />
            </div>
          )}
          {visibleEntries.map((entry) => (
            <div
              key={entry.rank}
              className={`flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg ${
                entry.isUser ? 'bg-bloom-50 ring-1 ring-bloom-200' : ''
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                entry.rank <= 3
                  ? entry.rank === 1 ? 'bg-amber-100 text-amber-600'
                    : entry.rank === 2 ? 'bg-gray-100 text-gray-600'
                    : 'bg-orange-100 text-orange-600'
                  : 'bg-gray-50 text-gray-500'
              }`}>
                {entry.rank <= 3 ? <Medal className="w-3 h-3" /> : entry.rank}
              </div>
              <span className={`flex-1 text-sm truncate ${
                entry.isUser ? 'font-medium text-bloom-700' : 'text-gray-600'
              }`}>
                {entry.isUser ? 'You' : (entry.displayName || `User #${entry.rank}`)}
              </span>
              <span className={`text-xs font-semibold ${
                entry.isUser ? 'text-bloom-600' :
                entry.netWorth !== null && entry.netWorth < 0 ? 'text-red-500' : 'text-gray-500'
              }`}>
                {formatNW(entry.netWorth)}
              </span>
            </div>
          ))}
          {hasBelow && (
            <div className="flex items-center justify-center py-0.5">
              <ChevronDown className="w-3 h-3 text-gray-300" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
