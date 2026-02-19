import { getISOWeek, startOfISOWeek, endOfISOWeek, format } from 'date-fns'

export type ChallengeType = 'save_amount' | 'reduce_category' | 'no_spend_day' | 'streak'

export type ChallengeTemplate = {
  key: string
  title: string
  description: string
  type: ChallengeType
  target: number
  rewardXp: number
}

export const CHALLENGE_POOL: ChallengeTemplate[] = [
  {
    key: 'hat_trick',
    title: 'Hat Trick',
    description: 'Log transactions 3 days in a row',
    type: 'streak',
    target: 3,
    rewardXp: 30,
  },
  {
    key: 'work_week',
    title: 'Work Week',
    description: 'Log a transaction every weekday',
    type: 'streak',
    target: 5,
    rewardXp: 60,
  },
  {
    key: 'perfect_week',
    title: 'Perfect Week',
    description: 'Log a transaction every day this week',
    type: 'streak',
    target: 7,
    rewardXp: 100,
  },
  {
    key: 'no_spend_day',
    title: 'No-Spend Day',
    description: 'Have one day with zero spending this week',
    type: 'no_spend_day',
    target: 1,
    rewardXp: 25,
  },
  {
    key: 'frugal_pair',
    title: 'Frugal Pair',
    description: 'Have 2 no-spend days this week',
    type: 'no_spend_day',
    target: 2,
    rewardXp: 50,
  },
  {
    key: 'fifty_saver',
    title: '$50 Saver',
    description: 'Save $50 more than you spend this week',
    type: 'save_amount',
    target: 50,
    rewardXp: 40,
  },
  {
    key: 'century_saver',
    title: 'Century Saver',
    description: 'Save $100 more than you spend this week',
    type: 'save_amount',
    target: 100,
    rewardXp: 75,
  },
  {
    key: 'big_saver',
    title: 'Big Saver',
    description: 'Save $200 more than you spend this week',
    type: 'save_amount',
    target: 200,
    rewardXp: 120,
  },
]

/** Deterministic weekly pair: 8-week rotation before repeating */
export function getWeekChallenges(weekNumber: number): [ChallengeTemplate, ChallengeTemplate] {
  const size = CHALLENGE_POOL.length
  const idx1 = (weekNumber - 1) % size
  const idx2 = (weekNumber - 1 + Math.floor(size / 2)) % size
  return [CHALLENGE_POOL[idx1], CHALLENGE_POOL[idx2]]
}

export function getWeekBounds(): { start: string; end: string } {
  const now = new Date()
  return {
    start: format(startOfISOWeek(now), 'yyyy-MM-dd'),
    end: format(endOfISOWeek(now), 'yyyy-MM-dd'),
  }
}

type WeekTransaction = { date: string; type: string; amount: number }

export function calculateChallengeProgress(
  type: ChallengeType,
  weekTransactions: WeekTransaction[],
  currentStreak: number,
): number {
  if (type === 'streak') {
    return currentStreak
  }

  if (type === 'no_spend_day') {
    const { start } = getWeekBounds()
    const today = format(new Date(), 'yyyy-MM-dd')
    const expenseDays = new Set(
      weekTransactions.filter(t => t.type === 'expense').map(t => t.date)
    )
    let noSpendDays = 0
    let cursor = new Date(start + 'T00:00:00')
    while (format(cursor, 'yyyy-MM-dd') <= today) {
      if (!expenseDays.has(format(cursor, 'yyyy-MM-dd'))) noSpendDays++
      cursor = new Date(cursor.getTime() + 86400000)
    }
    return noSpendDays
  }

  if (type === 'save_amount') {
    const income = weekTransactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0)
    const expenses = weekTransactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0)
    return Math.max(0, income - expenses)
  }

  return 0
}
