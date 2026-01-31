'use client'

import { clsx } from 'clsx'
import * as Icons from 'lucide-react'

interface CategoryChipProps {
  name: string
  color: string
  icon: string
  size?: 'sm' | 'md'
  showLabel?: boolean
}

export function CategoryChip({ name, color, icon, size = 'md', showLabel = false }: CategoryChipProps) {
  // Get the icon component dynamically
  const IconComponent = getIconComponent(icon)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
  }

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  }

  return (
    <div className={clsx('flex items-center gap-2', showLabel && 'flex-col')}>
      <div
        className={clsx(
          'rounded-xl flex items-center justify-center flex-shrink-0',
          sizeClasses[size]
        )}
        style={{ backgroundColor: `${color}20` }}
      >
        <IconComponent
          className={iconSizeClasses[size]}
          style={{ color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-600 font-medium truncate max-w-[60px]">
          {name}
        </span>
      )}
    </div>
  )
}

function getIconComponent(iconName: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  // Convert kebab-case to PascalCase
  const pascalCase = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')

  // Try to get the icon from lucide-react
  const icon = (Icons as Record<string, unknown>)[pascalCase] as React.ComponentType<{ className?: string; style?: React.CSSProperties }> | undefined

  // Fallback to CircleDot if not found
  return icon || Icons.CircleDot
}
