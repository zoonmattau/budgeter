'use client'

import Link from 'next/link'
import { Settings } from 'lucide-react'

export function TopBar() {
  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-gray-100 z-40">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/Seedling.png" alt="Seedling" width={32} height={32} className="w-8 h-8" />
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
