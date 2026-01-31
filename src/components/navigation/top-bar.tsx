'use client'

import Link from 'next/link'
import { Bell, Flame } from 'lucide-react'
import type { Tables } from '@/lib/database.types'

interface TopBarProps {
  profile: Tables<'profiles'> | null
}

export function TopBar({ profile }: TopBarProps) {
  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-gray-100 z-40">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-bloom-400 to-bloom-600 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <span className="font-display font-semibold text-gray-900">Bloom</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Streak indicator */}
          <div className="flex items-center gap-1 text-coral-500 bg-coral-50 px-2 py-1 rounded-full">
            <Flame className="w-4 h-4" />
            <span className="text-xs font-semibold">3</span>
          </div>

          {/* Notifications */}
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-bloom-500 rounded-full" />
          </button>

          {/* Avatar */}
          <Link href="/settings" className="block">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-bloom-200 to-sprout-200 flex items-center justify-center text-sm font-medium text-gray-700">
              {profile?.display_name?.[0]?.toUpperCase() || '?'}
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
}
