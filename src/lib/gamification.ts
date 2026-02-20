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
  // Onboarding
  | 'first_transaction'
  | 'first_goal'
  | 'budget_set'
  // Streaks
  | 'streak_3'
  | 'streak_7'
  | 'streak_14'
  | 'streak_30'
  | 'streak_100'
  // Transaction volume
  | 'transactions_10'
  | 'transactions_50'
  | 'transactions_100'
  // Goals
  | 'goal_complete'
  | 'goals_3_complete'
  | 'goals_5_complete'
  // Challenges
  | 'challenges_won'
  | 'challenges_3'
  | 'challenges_10'
  // Financial milestones
  | 'net_worth_positive'
  | 'savings_rate_20'
  | 'under_budget'

export interface AchievementMeta {
  label: string
  description: string
  icon: string
  xpReward: number
}

export const ACHIEVEMENT_CATALOG: Record<AchievementType, AchievementMeta> = {
  // Onboarding
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
  budget_set: {
    label: 'Planner',
    description: 'Set up your first budget',
    icon: '📊',
    xpReward: 30,
  },
  // Streaks
  streak_3: {
    label: 'On a Roll',
    description: 'Logged transactions 3 days in a row',
    icon: '✨',
    xpReward: 15,
  },
  streak_7: {
    label: 'Week Warrior',
    description: 'Logged transactions 7 days in a row',
    icon: '🔥',
    xpReward: 50,
  },
  streak_14: {
    label: 'Fortnight Focused',
    description: 'Logged transactions 14 days in a row',
    icon: '⚡',
    xpReward: 100,
  },
  streak_30: {
    label: 'Monthly Master',
    description: 'Logged transactions 30 days in a row',
    icon: '💫',
    xpReward: 200,
  },
  streak_100: {
    label: 'Centurion',
    description: 'Logged transactions 100 days in a row',
    icon: '🌟',
    xpReward: 500,
  },
  // Transaction volume
  transactions_10: {
    label: 'Getting Started',
    description: 'Logged 10 transactions',
    icon: '📝',
    xpReward: 30,
  },
  transactions_50: {
    label: 'Dedicated Tracker',
    description: 'Logged 50 transactions',
    icon: '📈',
    xpReward: 75,
  },
  transactions_100: {
    label: 'Century Club',
    description: 'Logged 100 transactions',
    icon: '💯',
    xpReward: 150,
  },
  // Goals
  goal_complete: {
    label: 'Goal Crusher',
    description: 'Completed a savings goal',
    icon: '🏆',
    xpReward: 100,
  },
  goals_3_complete: {
    label: 'Hat Trick',
    description: 'Completed 3 savings goals',
    icon: '🎖️',
    xpReward: 200,
  },
  goals_5_complete: {
    label: 'Goal Machine',
    description: 'Completed 5 savings goals',
    icon: '🏅',
    xpReward: 350,
  },
  // Challenges
  challenges_won: {
    label: 'Challenge Champion',
    description: 'Completed your first challenge',
    icon: '🥇',
    xpReward: 75,
  },
  challenges_3: {
    label: 'Triple Threat',
    description: 'Won 3 weekly challenges',
    icon: '🥈',
    xpReward: 150,
  },
  challenges_10: {
    label: 'Challenge Legend',
    description: 'Won 10 weekly challenges',
    icon: '🏆',
    xpReward: 300,
  },
  // Financial milestones
  net_worth_positive: {
    label: 'In the Green',
    description: 'Achieved a positive net worth',
    icon: '🌿',
    xpReward: 100,
  },
  savings_rate_20: {
    label: 'Super Saver',
    description: 'Saved 20% or more of income in a month',
    icon: '💰',
    xpReward: 75,
  },
  under_budget: {
    label: 'Under Budget',
    description: 'Finished a month spending less than your budget',
    icon: '🎯',
    xpReward: 100,
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
