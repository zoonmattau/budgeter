'use client'

import { useEffect, useState } from 'react'
import type { AchievementType } from '@/lib/gamification'
import { getAchievementMeta } from '@/lib/gamification'

type ToastItem =
  | { type: 'achievement'; achievementType: AchievementType }
  | { type: 'levelup'; levelIcon: string; levelName: string; level: number }

interface AchievementToastProps {
  achievements: AchievementType[]
  levelUp?: { icon: string; name: string; level: number } | null
  onDismiss: () => void
}

export function AchievementToast({ achievements, levelUp, onDismiss }: AchievementToastProps) {
  const [visible, setVisible] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  const items: ToastItem[] = [
    ...achievements.map(a => ({ type: 'achievement' as const, achievementType: a })),
    ...(levelUp ? [{ type: 'levelup' as const, levelIcon: levelUp.icon, levelName: levelUp.name, level: levelUp.level }] : []),
  ]

  useEffect(() => {
    if (items.length === 0) {
      onDismiss()
      return
    }

    const timer = setTimeout(() => {
      if (currentIndex < items.length - 1) {
        setCurrentIndex(i => i + 1)
      } else {
        setVisible(false)
        setTimeout(onDismiss, 300)
      }
    }, 2800)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, items.length])

  if (items.length === 0 || !visible) return null

  const item = items[currentIndex]

  if (item.type === 'achievement') {
    const meta = getAchievementMeta(item.achievementType)
    return (
      <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <div className="flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl min-w-[240px] max-w-[320px]">
          <span className="text-2xl flex-shrink-0">{meta.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Achievement Unlocked</p>
            <p className="text-sm font-semibold truncate">{meta.label}</p>
          </div>
          <span className="text-xs font-bold text-sprout-400 flex-shrink-0">+{meta.xpReward} XP</span>
        </div>
        {items.length > 1 && (
          <div className="flex justify-center gap-1 mt-2">
            {items.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${i === currentIndex ? 'w-4 bg-white' : 'w-1 bg-white/30'}`}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Level-up toast
  return (
    <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      <div className="flex items-center gap-3 bg-gradient-to-r from-sprout-600 to-bloom-600 text-white px-4 py-3 rounded-2xl shadow-xl min-w-[240px] max-w-[320px]">
        <span className="text-2xl flex-shrink-0">{item.levelIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/70 font-medium uppercase tracking-wide">Level Up!</p>
          <p className="text-sm font-semibold">You reached {item.levelName}</p>
        </div>
        <span className="text-xs font-bold text-white/80 flex-shrink-0">Lv {item.level}</span>
      </div>
    </div>
  )
}
