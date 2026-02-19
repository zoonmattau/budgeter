'use server'

import { createClient } from '@/lib/supabase/server'
import { getISOWeek } from 'date-fns'
import {
  getWeekChallenges,
  getWeekBounds,
  calculateChallengeProgress,
  type ChallengeType,
} from '@/lib/challenges'
import { awardXP, checkAndUnlockAchievements } from './gamification'
import type { Tables } from '@/lib/database.types'

type WeekTransaction = { date: string; type: string; amount: number }

export async function syncWeeklyChallenges(
  userId: string,
  weekTransactions: WeekTransaction[],
  currentStreak: number,
): Promise<Tables<'challenges'>[]> {
  const supabase = await createClient()
  const weekNumber = getISOWeek(new Date())
  const { start, end } = getWeekBounds()
  const [t1, t2] = getWeekChallenges(weekNumber)

  // Fetch existing challenges for this week
  const { data: existing } = await supabase
    .from('challenges')
    .select('*')
    .eq('user_id', userId)
    .eq('start_date', start)

  // Create any missing challenges for this week
  const toCreate = [t1, t2].filter(
    t => !existing?.some(e => e.title === t.title)
  )

  if (toCreate.length > 0) {
    await supabase.from('challenges').insert(
      toCreate.map(t => ({
        user_id: userId,
        title: t.title,
        description: t.description,
        type: t.type,
        target_value: t.target,
        current_value: 0,
        start_date: start,
        end_date: end,
        status: 'active' as const,
        reward_xp: t.rewardXp,
      }))
    )
  }

  // Fetch all challenges for this week (including newly created)
  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .eq('user_id', userId)
    .eq('start_date', start)

  if (!challenges) return []

  // Update progress for each active challenge
  for (const challenge of challenges) {
    if (challenge.status === 'completed') continue

    const progress = calculateChallengeProgress(
      challenge.type as ChallengeType,
      weekTransactions,
      currentStreak,
    )
    const clamped = Math.min(progress, challenge.target_value)
    const isComplete = progress >= challenge.target_value

    if (isComplete) {
      // Conditional update: only fires if status is still 'active', preventing double-rewards
      const { data: completed } = await supabase
        .from('challenges')
        .update({ current_value: clamped, status: 'completed' })
        .eq('id', challenge.id)
        .eq('status', 'active')
        .select()
        .single()

      if (completed) {
        await awardXP(userId, challenge.reward_xp)

        const { data: stats } = await supabase
          .from('user_stats')
          .select('challenges_won')
          .eq('user_id', userId)
          .single()

        const newWon = (stats?.challenges_won ?? 0) + 1
        await supabase
          .from('user_stats')
          .upsert({ user_id: userId, challenges_won: newWon }, { onConflict: 'user_id' })

        void checkAndUnlockAchievements(userId, { challengesWon: newWon })
      }
    } else {
      await supabase
        .from('challenges')
        .update({ current_value: clamped })
        .eq('id', challenge.id)
    }
  }

  // Return final state for rendering
  const { data: final } = await supabase
    .from('challenges')
    .select('*')
    .eq('user_id', userId)
    .eq('start_date', start)
    .order('status', { ascending: true }) // active before completed

  return final || []
}
