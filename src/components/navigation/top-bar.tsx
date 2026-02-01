'use client'

import Link from 'next/link'
import { Settings } from 'lucide-react'

export function TopBar() {
  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-gray-100 z-40">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-bloom-400 to-bloom-600 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19V6m0 0c-2 0-4 1.5-4 4s2 4 4 4m0-8c2 0 4 1.5 4 4s-2 4-4 4"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 22c-1 0-2-.5-2-1.5S11 19 12 19s2 .5 2 1.5-1 1.5-2 1.5z"
              />
            </svg>
          </div>
          <span className="font-display font-semibold text-gray-900">Seedling</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Settings */}
          <Link href="/settings" className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
