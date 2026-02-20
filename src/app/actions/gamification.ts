'use server'

import { createClient } from '@/lib/supabase/server'
import type { AchievementType } from '@/lib/gamification'
import { getAchievementMeta, getLevel } from '@/lib/gamification'

export interface AwardXPResult {
  leveledUp: boolean
  newLevel?: number
  newLevelName?: string
  newLevelIcon?: string
}

/**
 * Increment total_xp for a user. Returns level-up info if a new level was reached.
 * Upserts the user_stats row if it doesn't exist.
 */
export async function awardXP(userId: string, amount: number): Promise<AwardXPResult> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('user_stats')
    .select('id, total_xp')
    .eq('user_id', userId)
    .maybeSingle()

  const prevXp = existing?.total_xp ?? 0
  const newXp = prevXp + amount
  const prevLevel = getLevel(prevXp)
  const newLevelInfo = getLevel(newXp)
  const leveledUp = newLevelInfo.level > prevLevel.level

  if (existing) {
    await supabase
      .from('user_stats')
      .update({
        total_xp: newXp,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('user_stats').insert({
      user_id: userId,
      total_xp: newXp,
      current_streak: 0,
      longest_streak: 0,
      goals_completed: 0,
      challenges_won: 0,
      updated_at: new Date().toISOString(),
    })
  }

  if (leveledUp) {
    return {
      leveledUp: true,
      newLevel: newLevelInfo.level,
      newLevelName: newLevelInfo.name,
      newLevelIcon: newLevelInfo.icon,
    }
  }
  return { leveledUp: false }
}

/**
 * Update current_streak and longest_streak in user_stats.
 * Only updates longest_streak if the new streak exceeds the previous record.
 */
export async function syncStreak(userId: string, streak: number): Promise<void> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('user_stats')
    .select('id, current_streak, longest_streak')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('user_stats')
      .update({
        current_streak: streak,
        longest_streak: Math.max(existing.longest_streak, streak),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('user_stats').insert({
      user_id: userId,
      total_xp: 0,
      current_streak: streak,
      longest_streak: streak,
      goals_completed: 0,
      challenges_won: 0,
      updated_at: new Date().toISOString(),
    })
  }
}

interface AchievementContext {
  transactionCount?: number
  goalCount?: number
  goalCompleted?: boolean
  goalsCompleted?: number
  streak?: number
  budgetSet?: boolean
  challengesWon?: number
  netWorthPositive?: boolean
  savingsRate?: number
  underBudget?: boolean
}

/**
 * Check conditions and unlock applicable achievements for a user.
 * Inserts into the achievements table (idempotent — duplicate inserts are ignored
 * via unique constraint on user_id + type).
 * Returns an array of newly unlocked achievement types.
 */
export async function checkAndUnlockAchievements(
  userId: string,
  context: AchievementContext
): Promise<AchievementType[]> {
  const supabase = await createClient()

  // Fetch already-unlocked achievement types for this user
  const { data: existing } = await supabase
    .from('achievements')
    .select('type')
    .eq('user_id', userId)

  const alreadyUnlocked = new Set((existing || []).map(a => a.type))

  const toUnlock: AchievementType[] = []

  // Onboarding
  if (context.transactionCount && context.transactionCount >= 1 && !alreadyUnlocked.has('first_transaction')) {
    toUnlock.push('first_transaction')
  }
  if (context.goalCount && context.goalCount >= 1 && !alreadyUnlocked.has('first_goal')) {
    toUnlock.push('first_goal')
  }
  if (context.budgetSet && !alreadyUnlocked.has('budget_set')) {
    toUnlock.push('budget_set')
  }

  // Streaks
  if (context.streak !== undefined) {
    if (context.streak >= 3 && !alreadyUnlocked.has('streak_3')) toUnlock.push('streak_3')
    if (context.streak >= 7 && !alreadyUnlocked.has('streak_7')) toUnlock.push('streak_7')
    if (context.streak >= 14 && !alreadyUnlocked.has('streak_14')) toUnlock.push('streak_14')
    if (context.streak >= 30 && !alreadyUnlocked.has('streak_30')) toUnlock.push('streak_30')
    if (context.streak >= 100 && !alreadyUnlocked.has('streak_100')) toUnlock.push('streak_100')
  }

  // Transaction volume — query total when a transaction event arrives
  if (context.transactionCount !== undefined) {
    const needsCount =
      !alreadyUnlocked.has('transactions_10') ||
      !alreadyUnlocked.has('transactions_50') ||
      !alreadyUnlocked.has('transactions_100')

    if (needsCount) {
      const { count } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('household_id', null)
        .eq('type', 'expense')

      const total = count ?? 0
      if (total >= 10 && !alreadyUnlocked.has('transactions_10')) toUnlock.push('transactions_10')
      if (total >= 50 && !alreadyUnlocked.has('transactions_50')) toUnlock.push('transactions_50')
      if (total >= 100 && !alreadyUnlocked.has('transactions_100')) toUnlock.push('transactions_100')
    }
  }

  // Goals
  if (context.goalCompleted && !alreadyUnlocked.has('goal_complete')) {
    toUnlock.push('goal_complete')
  }
  if (context.goalsCompleted !== undefined) {
    if (context.goalsCompleted >= 3 && !alreadyUnlocked.has('goals_3_complete')) toUnlock.push('goals_3_complete')
    if (context.goalsCompleted >= 5 && !alreadyUnlocked.has('goals_5_complete')) toUnlock.push('goals_5_complete')
  }

  // Challenges
  if (context.challengesWon !== undefined) {
    if (context.challengesWon >= 1 && !alreadyUnlocked.has('challenges_won')) toUnlock.push('challenges_won')
    if (context.challengesWon >= 3 && !alreadyUnlocked.has('challenges_3')) toUnlock.push('challenges_3')
    if (context.challengesWon >= 10 && !alreadyUnlocked.has('challenges_10')) toUnlock.push('challenges_10')
  }

  // Financial milestones
  if (context.netWorthPositive && !alreadyUnlocked.has('net_worth_positive')) {
    toUnlock.push('net_worth_positive')
  }
  if (context.savingsRate !== undefined && context.savingsRate >= 20 && !alreadyUnlocked.has('savings_rate_20')) {
    toUnlock.push('savings_rate_20')
  }
  if (context.underBudget && !alreadyUnlocked.has('under_budget')) {
    toUnlock.push('under_budget')
  }

  if (toUnlock.length === 0) return []

  const now = new Date().toISOString()
  const rows = toUnlock.map(type => ({
    user_id: userId,
    type,
    earned_at: now,
  }))

  // Insert ignoring conflicts (unique constraint handles idempotency)
  await supabase.from('achievements').upsert(rows, {
    onConflict: 'user_id,type',
    ignoreDuplicates: true,
  })

  // Award XP for each newly unlocked achievement
  let totalXpGain = 0
  for (const type of toUnlock) {
    totalXpGain += getAchievementMeta(type).xpReward
  }
  if (totalXpGain > 0) {
    await awardXP(userId, totalXpGain)
  }

  return toUnlock
}
