'use client'

import { useScope } from '@/lib/scope-context'
import { Home, User } from 'lucide-react'

export function ScopeToggle() {
  const { scope, setScope, isInHousehold, householdName } = useScope()

  // Don't render if user is not in a household
  if (!isInHousehold) {
    return null
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-full">
      <button
        onClick={() => setScope('personal')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          scope === 'personal'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <User className="w-4 h-4" />
        <span>Personal</span>
      </button>
      <button
        onClick={() => setScope('household')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          scope === 'household'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Home className="w-4 h-4" />
        <span>{householdName || 'Household'}</span>
      </button>
    </div>
  )
}
