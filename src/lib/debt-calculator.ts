/**
 * Debt payoff calculator supporting avalanche and snowball strategies
 */

export interface Debt {
  id: string
  name: string
  balance: number
  interestRate: number // Annual percentage rate
  minimumPayment: number
  institution?: string | null
  type?: string
  originalAmount?: number // Original debt amount for progress tracking
}

export interface MonthlyProjection {
  month: number
  date: Date
  debts: {
    id: string
    name: string
    balance: number
    payment: number
    interest: number
    isPaidOff: boolean
  }[]
  totalBalance: number
  totalPayment: number
  totalInterest: number
  cumulativeInterest: number
}

export type PayoffStrategy = 'avalanche' | 'snowball'

/**
 * Sort debts by strategy
 * - Avalanche: Highest interest rate first (saves most money)
 * - Snowball: Lowest balance first (psychological wins)
 */
function sortDebtsByStrategy(debts: Debt[], strategy: PayoffStrategy): Debt[] {
  const sorted = [...debts]
  if (strategy === 'avalanche') {
    // Highest interest rate first
    sorted.sort((a, b) => b.interestRate - a.interestRate)
  } else {
    // Lowest balance first
    sorted.sort((a, b) => a.balance - b.balance)
  }
  return sorted
}

/**
 * Calculate monthly interest for a debt
 */
function calculateMonthlyInterest(balance: number, annualRate: number): number {
  if (balance <= 0) return 0
  const monthlyRate = annualRate / 100 / 12
  return balance * monthlyRate
}

/**
 * Calculate complete payoff schedule with month-by-month projections
 */
export function calculatePayoffSchedule(
  debts: Debt[],
  extraPayment: number = 0,
  strategy: PayoffStrategy = 'avalanche',
  maxMonths: number = 360 // 30 years max
): MonthlyProjection[] {
  if (debts.length === 0) return []

  // Sort debts by strategy for targeting extra payments
  const sortedDebts = sortDebtsByStrategy(debts, strategy)

  // Initialize tracking
  const balances = new Map<string, number>()
  debts.forEach(d => balances.set(d.id, d.balance))

  const projections: MonthlyProjection[] = []
  let cumulativeInterest = 0
  const today = new Date()

  for (let month = 1; month <= maxMonths; month++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + month, 1)
    let remainingExtra = extraPayment
    const monthDebts: MonthlyProjection['debts'] = []
    let totalMonthInterest = 0

    // First pass: Calculate interest and apply minimum payments
    for (const debt of sortedDebts) {
      const currentBalance = balances.get(debt.id) || 0

      if (currentBalance <= 0) {
        monthDebts.push({
          id: debt.id,
          name: debt.name,
          balance: 0,
          payment: 0,
          interest: 0,
          isPaidOff: true,
        })
        // Add freed minimum payment to extra pool
        remainingExtra += debt.minimumPayment
        continue
      }

      // Calculate interest for this month
      const interest = calculateMonthlyInterest(currentBalance, debt.interestRate)
      totalMonthInterest += interest

      // Apply minimum payment (or remaining balance if less)
      const balanceWithInterest = currentBalance + interest
      const minPayment = Math.min(debt.minimumPayment, balanceWithInterest)
      const newBalance = Math.max(0, balanceWithInterest - minPayment)

      balances.set(debt.id, newBalance)

      monthDebts.push({
        id: debt.id,
        name: debt.name,
        balance: newBalance,
        payment: minPayment,
        interest,
        isPaidOff: newBalance <= 0,
      })
    }

    // Second pass: Apply extra payments in strategy order
    for (const debt of sortedDebts) {
      if (remainingExtra <= 0) break

      const debtEntry = monthDebts.find(d => d.id === debt.id)
      if (!debtEntry || debtEntry.balance <= 0) continue

      const extraApplied = Math.min(remainingExtra, debtEntry.balance)
      debtEntry.balance -= extraApplied
      debtEntry.payment += extraApplied
      debtEntry.isPaidOff = debtEntry.balance <= 0
      balances.set(debt.id, debtEntry.balance)
      remainingExtra -= extraApplied
    }

    cumulativeInterest += totalMonthInterest

    const totalBalance = Array.from(balances.values()).reduce((sum, b) => sum + b, 0)
    const totalPayment = monthDebts.reduce((sum, d) => sum + d.payment, 0)

    projections.push({
      month,
      date: monthDate,
      debts: monthDebts,
      totalBalance: Math.round(totalBalance * 100) / 100,
      totalPayment: Math.round(totalPayment * 100) / 100,
      totalInterest: Math.round(totalMonthInterest * 100) / 100,
      cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
    })

    // Stop if all debts are paid off
    if (totalBalance <= 0) break
  }

  return projections
}

/**
 * Calculate total interest paid over the life of the debts
 */
export function calculateTotalInterest(
  debts: Debt[],
  extraPayment: number = 0,
  strategy: PayoffStrategy = 'avalanche'
): number {
  const schedule = calculatePayoffSchedule(debts, extraPayment, strategy)
  return schedule.length > 0 ? schedule[schedule.length - 1].cumulativeInterest : 0
}

/**
 * Calculate months to payoff
 */
export function calculateMonthsToPayoff(
  debts: Debt[],
  extraPayment: number = 0,
  strategy: PayoffStrategy = 'avalanche'
): number {
  const schedule = calculatePayoffSchedule(debts, extraPayment, strategy)
  return schedule.length
}

/**
 * Compare avalanche vs snowball strategies
 */
export function compareStrategies(debts: Debt[], extraPayment: number = 0): {
  avalanche: { months: number; totalInterest: number }
  snowball: { months: number; totalInterest: number }
  interestSaved: number
  monthsDifference: number
} {
  const avalancheSchedule = calculatePayoffSchedule(debts, extraPayment, 'avalanche')
  const snowballSchedule = calculatePayoffSchedule(debts, extraPayment, 'snowball')

  const avalanche = {
    months: avalancheSchedule.length,
    totalInterest: avalancheSchedule.length > 0
      ? avalancheSchedule[avalancheSchedule.length - 1].cumulativeInterest
      : 0,
  }

  const snowball = {
    months: snowballSchedule.length,
    totalInterest: snowballSchedule.length > 0
      ? snowballSchedule[snowballSchedule.length - 1].cumulativeInterest
      : 0,
  }

  return {
    avalanche,
    snowball,
    interestSaved: snowball.totalInterest - avalanche.totalInterest,
    monthsDifference: snowball.months - avalanche.months,
  }
}

/**
 * Calculate available funds for extra debt repayment
 */
export function calculateAvailableFunds(
  monthlyIncome: number,
  monthlyBills: number,
  minimumDebtPayments: number
): number {
  const available = monthlyIncome - monthlyBills - minimumDebtPayments
  return Math.max(0, available)
}

/**
 * Format months as years and months string
 */
export function formatPayoffTime(months: number): string {
  if (months <= 0) return 'Paid off'
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (years === 0) {
    return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
  }
  if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`
  }
  return `${years}y ${remainingMonths}m`
}
