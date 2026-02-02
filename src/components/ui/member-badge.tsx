'use client'

import { getMemberColor } from '@/lib/scope-context'

interface MemberBadgeProps {
  name: string | null
  index?: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function MemberBadge({
  name,
  index = 0,
  showLabel = false,
  size = 'sm',
}: MemberBadgeProps) {
  const displayName = name || 'Unknown'
  const initial = displayName.charAt(0).toUpperCase()
  const colorClass = getMemberColor(index)

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  }

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center text-white font-medium`}
        title={displayName}
      >
        {initial}
      </div>
      {showLabel && (
        <span className="text-sm text-gray-600 truncate max-w-[100px]">
          {displayName}
        </span>
      )}
    </div>
  )
}

// Helper to get member index from user_id in a members array
export function getMemberIndex(
  userId: string,
  members: { user_id: string }[]
): number {
  const index = members.findIndex((m) => m.user_id === userId)
  return index >= 0 ? index : 0
}
