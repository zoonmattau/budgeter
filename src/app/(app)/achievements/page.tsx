import { createClient } from '@/lib/supabase/server'
import { ACHIEVEMENT_CATALOG, getLevel, type AchievementType } from '@/lib/gamification'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function AchievementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: earned }, { data: userStats }] = await Promise.all([
    supabase
      .from('achievements')
      .select('type, earned_at')
      .eq('user_id', user.id),
    supabase
      .from('user_stats')
      .select('total_xp, current_streak, longest_streak')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const earnedMap = new Map((earned || []).map(a => [a.type, a.earned_at as string]))
  const achievementTypes = Object.keys(ACHIEVEMENT_CATALOG) as AchievementType[]
  const totalXp = userStats?.total_xp ?? 0
  const levelInfo = getLevel(totalXp)

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Achievements</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {earnedMap.size} of {achievementTypes.length} badges earned
          </p>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-gray-900">{levelInfo.icon}</p>
          <p className="text-xs font-semibold text-gray-700 mt-1">{levelInfo.name}</p>
          <p className="text-[10px] text-gray-400">Level {levelInfo.level}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-bloom-600">{totalXp}</p>
          <p className="text-xs font-semibold text-gray-700 mt-1">Total XP</p>
          {!levelInfo.nextLevelXp ? (
            <p className="text-[10px] text-bloom-500">Max level!</p>
          ) : (
            <p className="text-[10px] text-gray-400">{levelInfo.nextLevelXp - totalXp} to next</p>
          )}
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-gray-900">🔥</p>
          <p className="text-xs font-semibold text-gray-700 mt-1">{userStats?.current_streak ?? 0} day streak</p>
          <p className="text-[10px] text-gray-400">Best: {userStats?.longest_streak ?? 0}</p>
        </div>
      </div>

      {/* Achievement grid */}
      <div>
        <h2 className="font-display font-semibold text-gray-900 mb-3">Badges</h2>
        <div className="grid grid-cols-2 gap-3">
          {achievementTypes.map(type => {
            const meta = ACHIEVEMENT_CATALOG[type]
            const earnedAt = earnedMap.get(type)
            const isUnlocked = !!earnedAt

            return (
              <div
                key={type}
                className={`card transition-all ${isUnlocked ? '' : 'opacity-40 grayscale'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl flex-shrink-0 leading-none mt-0.5">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{meta.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{meta.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-bold text-sprout-600">+{meta.xpReward} XP</span>
                      {isUnlocked ? (
                        <span className="text-[10px] text-gray-400">
                          {format(new Date(earnedAt), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-300 font-medium">Locked</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
