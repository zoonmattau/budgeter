import Link from 'next/link'
import { getLevel } from '@/lib/gamification'

interface PlayerStatsProps {
  totalXp: number
  streak: number
  achievementCount: number
  streakAtRisk?: boolean
}

export function PlayerStats({ totalXp, streak, achievementCount, streakAtRisk = false }: PlayerStatsProps) {
  const levelInfo = getLevel(totalXp)
  const isMaxLevel = levelInfo.nextLevelXp === null
  const progressPercent = isMaxLevel
    ? 100
    : Math.min(
        (levelInfo.xpInLevel / (levelInfo.nextLevelXp! - levelInfo.xpForLevel)) * 100,
        100
      )

  return (
    <div className={`card ${streakAtRisk ? 'border border-amber-200' : ''}`}>
      <div className="flex items-center gap-4">
        {/* Level */}
        <div className="flex flex-col items-center min-w-[52px]">
          <span className="text-2xl leading-none">{levelInfo.icon}</span>
          <span className="text-[10px] font-semibold text-gray-500 mt-1 uppercase tracking-wide">
            Lv {levelInfo.level}
          </span>
        </div>

        {/* XP bar + label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm font-semibold text-gray-800">{levelInfo.name}</span>
            {!isMaxLevel && (
              <span className="text-[11px] text-gray-400">
                {levelInfo.xpInLevel} / {levelInfo.nextLevelXp! - levelInfo.xpForLevel} XP
              </span>
            )}
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sprout-400 to-bloom-400 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {isMaxLevel && (
            <p className="text-[11px] text-bloom-600 mt-0.5 font-medium">Max level reached!</p>
          )}
        </div>

        {/* Streak */}
        <div className="flex flex-col items-center min-w-[44px]">
          <span className="text-lg leading-none">{streak > 0 ? '🔥' : '💤'}</span>
          <span className="text-[10px] font-semibold text-gray-500 mt-1 text-center">
            {streak > 0 ? `${streak}d` : 'Start!'}
          </span>
        </div>

        {/* Achievements — links to full achievements page */}
        <Link href="/achievements" className="flex flex-col items-center min-w-[44px]">
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-bloom-100 text-bloom-700 text-xs font-bold">
            {achievementCount}
          </span>
          <span className="text-[10px] text-gray-400 mt-1">badges</span>
        </Link>
      </div>

      {streakAtRisk && (
        <p className="text-[11px] text-amber-600 font-medium mt-2 pt-2 border-t border-amber-100">
          🔥 Log a transaction today to keep your {streak}-day streak!
        </p>
      )}
    </div>
  )
}
