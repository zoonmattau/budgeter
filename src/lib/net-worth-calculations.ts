interface Snapshot {
  snapshot_date: string
  net_worth: number
  total_assets: number
  total_liabilities: number
}

interface Goal {
  id: string
  name: string
  target_amount: number
  goal_type: 'savings' | 'debt_payoff'
}

interface Milestone {
  amount: number
  name: string
  isGoal: boolean
}

const AUTO_MILESTONES = [0, 1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000]

/**
 * Find the snapshot closest to a target date, within a tolerance window.
 */
export function findSnapshotNearDate(
  snapshots: Snapshot[],
  targetDate: Date,
  toleranceDays = 5
): Snapshot | null {
  if (snapshots.length === 0) return null

  let best: Snapshot | null = null
  let bestDiff = Infinity

  for (const snap of snapshots) {
    const diff = Math.abs(new Date(snap.snapshot_date).getTime() - targetDate.getTime())
    const diffDays = diff / (1000 * 60 * 60 * 24)
    if (diffDays <= toleranceDays && diff < bestDiff) {
      best = snap
      bestDiff = diff
    }
  }

  return best
}

/**
 * Calculate the change this month vs last month.
 */
export function calculateMonthlyChange(
  snapshots: Snapshot[],
  currentNetWorth: number
): { monthlyChange: number; lastMonthChange: number | null } {
  const now = new Date()

  // ~30 days ago
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  const snapOneMonthAgo = findSnapshotNearDate(snapshots, oneMonthAgo)

  if (!snapOneMonthAgo) {
    return { monthlyChange: 0, lastMonthChange: null }
  }

  const monthlyChange = currentNetWorth - Number(snapOneMonthAgo.net_worth)

  // ~60 days ago for comparison
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate())
  const snapTwoMonthsAgo = findSnapshotNearDate(snapshots, twoMonthsAgo)

  const lastMonthChange = snapTwoMonthsAgo
    ? Number(snapOneMonthAgo.net_worth) - Number(snapTwoMonthsAgo.net_worth)
    : null

  return { monthlyChange, lastMonthChange }
}

/**
 * Weighted average monthly change over the last 3 months (3:2:1 weighting).
 * Falls back to single delta if <2 months data.
 */
export function calculateAvgMonthlyChange(
  snapshots: Snapshot[],
  currentNetWorth: number
): number {
  const now = new Date()

  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate())
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())

  const snap1 = findSnapshotNearDate(snapshots, oneMonthAgo)
  const snap2 = findSnapshotNearDate(snapshots, twoMonthsAgo)
  const snap3 = findSnapshotNearDate(snapshots, threeMonthsAgo)

  const changes: { value: number; weight: number }[] = []

  if (snap1) {
    changes.push({ value: currentNetWorth - Number(snap1.net_worth), weight: 3 })
  }
  if (snap1 && snap2) {
    changes.push({ value: Number(snap1.net_worth) - Number(snap2.net_worth), weight: 2 })
  }
  if (snap2 && snap3) {
    changes.push({ value: Number(snap2.net_worth) - Number(snap3.net_worth), weight: 1 })
  }

  if (changes.length === 0) return 0

  const totalWeight = changes.reduce((sum, c) => sum + c.weight, 0)
  return changes.reduce((sum, c) => sum + c.value * c.weight, 0) / totalWeight
}

/**
 * Get the next milestone above current net worth.
 * Checks auto-milestones and active savings goals, picks whichever is nearest above current.
 */
export function getNextMilestone(
  currentNetWorth: number,
  activeGoals: Goal[] = []
): Milestone | null {
  // For negative net worth, the next milestone is $0 (debt-free)
  if (currentNetWorth < 0) {
    return { amount: 0, name: 'Debt-free', isGoal: false }
  }

  // Find next auto-milestone above current
  const nextAuto = AUTO_MILESTONES.find(m => m > currentNetWorth)

  // Find nearest savings goal target above current
  const goalTargets = activeGoals
    .filter(g => g.goal_type === 'savings' && Number(g.target_amount) > currentNetWorth)
    .sort((a, b) => Number(a.target_amount) - Number(b.target_amount))

  const nearestGoal = goalTargets[0]

  const candidates: Milestone[] = []

  if (nextAuto !== undefined) {
    const label = nextAuto >= 1_000_000
      ? `$${nextAuto / 1_000_000}M`
      : `$${(nextAuto / 1_000).toLocaleString('en')}k`
    candidates.push({ amount: nextAuto, name: label, isGoal: false })
  }

  if (nearestGoal) {
    candidates.push({
      amount: Number(nearestGoal.target_amount),
      name: nearestGoal.name,
      isGoal: true,
    })
  }

  if (candidates.length === 0) return null

  // Pick the one nearest above current
  candidates.sort((a, b) => a.amount - b.amount)
  return candidates[0]
}

/**
 * Project when the user will reach a target net worth.
 * Returns null if change <= 0 or would take >60 months.
 */
export function projectArrivalDate(
  current: number,
  target: number,
  avgMonthlyChange: number
): Date | null {
  if (avgMonthlyChange <= 0) return null

  const monthsNeeded = (target - current) / avgMonthlyChange
  if (monthsNeeded > 60 || monthsNeeded <= 0) return null

  const arrival = new Date()
  arrival.setMonth(arrival.getMonth() + Math.ceil(monthsNeeded))
  return arrival
}

/**
 * Generate monthly projection data points from current to target (or 60 months max).
 */
export function generateProjectionData(
  current: number,
  avgMonthlyChange: number,
  target: number,
  startDate: Date = new Date()
): { date: string; projectedNetWorth: number }[] {
  if (avgMonthlyChange <= 0) return []

  const points: { date: string; projectedNetWorth: number }[] = []
  let value = current

  for (let i = 1; i <= 60; i++) {
    value += avgMonthlyChange
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1)
    points.push({
      date: d.toISOString().split('T')[0],
      projectedNetWorth: Math.round(value * 100) / 100,
    })
    if (value >= target) break
  }

  return points
}
