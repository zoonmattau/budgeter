// Level definitions: name, icon, XP threshold to reach this level
export const LEVELS = [
  { name: 'Seedling',    icon: '🌱', xpRequired: 0    },
  { name: 'Sapling',    icon: '🪴', xpRequired: 100  },
  { name: 'Sprout',     icon: '🌿', xpRequired: 250  },
  { name: 'Budgeter',   icon: '💚', xpRequired: 500  },
  { name: 'Bloom',      icon: '🌸', xpRequired: 1000 },
  { name: 'Flourishing',icon: '🌳', xpRequired: 2000 },
  { name: 'Thriving',   icon: '✨', xpRequired: 4000 },
] as const

export interface LevelInfo {
  level: number
  name: string
  icon: string
  /** Total XP required for the NEXT level (null if max level) */
  nextLevelXp: number | null
  /** XP earned within the current level band */
  xpInLevel: number
  /** Total XP required for this level */
  xpForLevel: number
}

export function getLevel(totalXp: number): LevelInfo {
  let levelIndex = 0
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVELS[i].xpRequired) {
      levelIndex = i
      break
    }
  }

  const current = LEVELS[levelIndex]
  const next = LEVELS[levelIndex + 1] ?? null

  return {
    level: levelIndex + 1,
    name: current.name,
    icon: current.icon,
    nextLevelXp: next ? next.xpRequired : null,
    xpInLevel: totalXp - current.xpRequired,
    xpForLevel: current.xpRequired,
  }
}

// Achievement catalog
export type AchievementType =
  | 'first_transaction'
  | 'first_goal'
  | 'goal_complete'
  | 'streak_7'
  | 'streak_30'
  | 'budget_set'
  | 'challenges_won'

export interface AchievementMeta {
  label: string
  description: string
  icon: string
  xpReward: number
}

export const ACHIEVEMENT_CATALOG: Record<AchievementType, AchievementMeta> = {
  first_transaction: {
    label: 'First Transaction',
    description: 'Logged your first expense',
    icon: '🧾',
    xpReward: 20,
  },
  first_goal: {
    label: 'Dream Setter',
    description: 'Created your first savings goal',
    icon: '🎯',
    xpReward: 25,
  },
  goal_complete: {
    label: 'Goal Crusher',
    description: 'Completed a savings goal',
    icon: '🏆',
    xpReward: 100,
  },
  streak_7: {
    label: '7-Day Streak',
    description: 'Logged transactions 7 days in a row',
    icon: '🔥',
    xpReward: 50,
  },
  streak_30: {
    label: '30-Day Streak',
    description: 'Logged transactions 30 days in a row',
    icon: '💫',
    xpReward: 200,
  },
  budget_set: {
    label: 'Planner',
    description: 'Set up your first budget',
    icon: '📊',
    xpReward: 30,
  },
  challenges_won: {
    label: 'Challenge Champion',
    description: 'Completed a challenge',
    icon: '🥇',
    xpReward: 75,
  },
}

export function getAchievementMeta(type: AchievementType): AchievementMeta {
  return ACHIEVEMENT_CATALOG[type]
}

/**
 * Calculates the current logging streak from a list of transactions.
 * A "streak" is the number of consecutive days (working backwards from today)
 * on which at least one expense was logged.
 */
export function calculateStreakFromTransactions(
  transactions: Array<{ date: string; type: string }>
): number {
  const today = new Date()
  const expenseDates = new Set(
    transactions.filter(t => t.type === 'expense').map(t => t.date)
  )

  let streak = 0
  for (let i = 0; i < 366; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]

    if (expenseDates.has(dateStr)) {
      streak++
    } else if (i > 0) {
      // Gap found — streak ends (skip today if no transaction yet)
      break
    }
  }

  return streak
}
