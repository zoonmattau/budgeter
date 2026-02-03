import { addDays, format, isBefore, isAfter, isSameDay, getDay, parseISO, startOfDay } from 'date-fns'

export interface TimelineEvent {
  type: 'income' | 'bill'
  name: string
  amount: number
}

export interface TimelineDay {
  date: string
  projectedBalance: number
  events: TimelineEvent[]
  isNegative: boolean
}

export interface IncomeEntry {
  id: string
  source: string
  amount: number
  is_recurring: boolean
  pay_frequency: 'weekly' | 'fortnightly' | 'monthly' | null
  pay_day: number | null
  next_pay_date: string | null
}

export interface Bill {
  id: string
  name: string
  amount: number
  frequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'
  next_due: string
  is_active: boolean
  is_one_off: boolean
}

export interface Account {
  id: string
  type: 'cash' | 'bank' | 'credit' | 'investment' | 'debt' | 'loan' | 'credit_card'
  balance: number
  is_asset: boolean
}

interface TimelineOptions {
  days: number
  accounts: Account[]
  incomeEntries: IncomeEntry[]
  bills: Bill[]
  startDate?: Date
}

function getNextPayDate(
  current: Date,
  payFrequency: 'weekly' | 'fortnightly' | 'monthly',
  payDay: number
): Date {
  const today = startOfDay(current)

  if (payFrequency === 'monthly') {
    // pay_day is 1-31
    const thisMonthPayday = new Date(today.getFullYear(), today.getMonth(), payDay)
    if (isBefore(thisMonthPayday, today) || isSameDay(thisMonthPayday, today)) {
      // If payday already passed this month, get next month
      return new Date(today.getFullYear(), today.getMonth() + 1, payDay)
    }
    return thisMonthPayday
  } else {
    // weekly or fortnightly - pay_day is 0-6 (Sun-Sat)
    const currentDayOfWeek = getDay(today)
    let daysUntilPayday = payDay - currentDayOfWeek
    if (daysUntilPayday < 0) {
      daysUntilPayday += 7
    }
    if (daysUntilPayday === 0 && payFrequency === 'fortnightly') {
      // For fortnightly, we need to track which week we're on
      // For simplicity, just add 7 days if it's today
      daysUntilPayday = 14
    }
    return addDays(today, daysUntilPayday)
  }
}

function getNextBillDate(
  current: Date,
  bill: Bill
): Date | null {
  const nextDue = parseISO(bill.next_due)

  // If next_due is in the future, use it
  if (isAfter(nextDue, current) || isSameDay(nextDue, current)) {
    return nextDue
  }

  // If it's a one-off bill that has passed, no future occurrences
  if (bill.is_one_off) {
    return null
  }

  // Calculate next occurrence based on frequency
  let next = nextDue
  while (isBefore(next, current)) {
    switch (bill.frequency) {
      case 'weekly':
        next = addDays(next, 7)
        break
      case 'fortnightly':
        next = addDays(next, 14)
        break
      case 'monthly':
        next = new Date(next.getFullYear(), next.getMonth() + 1, next.getDate())
        break
      case 'quarterly':
        next = new Date(next.getFullYear(), next.getMonth() + 3, next.getDate())
        break
      case 'yearly':
        next = new Date(next.getFullYear() + 1, next.getMonth(), next.getDate())
        break
    }
  }

  return next
}

function addDaysToFrequency(
  date: Date,
  frequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'
): Date {
  switch (frequency) {
    case 'weekly':
      return addDays(date, 7)
    case 'fortnightly':
      return addDays(date, 14)
    case 'monthly':
      return new Date(date.getFullYear(), date.getMonth() + 1, date.getDate())
    case 'quarterly':
      return new Date(date.getFullYear(), date.getMonth() + 3, date.getDate())
    case 'yearly':
      return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate())
  }
}

function addDaysToPayFrequency(
  date: Date,
  frequency: 'weekly' | 'fortnightly' | 'monthly',
  payDay: number
): Date {
  switch (frequency) {
    case 'weekly':
      return addDays(date, 7)
    case 'fortnightly':
      return addDays(date, 14)
    case 'monthly':
      return new Date(date.getFullYear(), date.getMonth() + 1, payDay)
  }
}

export function calculateTimeline(options: TimelineOptions): TimelineDay[] {
  const { days, accounts, incomeEntries, bills, startDate = new Date() } = options
  const start = startOfDay(startDate)
  const end = addDays(start, days)

  // Calculate starting spendable balance
  // Spendable = bank accounts + cash - credit card balances owed
  let startingBalance = 0
  for (const account of accounts) {
    if (account.type === 'bank' || account.type === 'cash') {
      startingBalance += account.balance
    } else if (account.type === 'credit' || account.type === 'credit_card') {
      // Credit cards: balance is stored as positive amount owed, so subtract it
      startingBalance -= account.balance
    }
  }

  // Generate all income events within the time range
  const incomeEvents: { date: Date; name: string; amount: number }[] = []
  for (const income of incomeEntries) {
    if (!income.is_recurring || !income.pay_frequency || income.pay_day === null) {
      continue
    }

    // Start from next_pay_date if set, otherwise calculate
    let payDate: Date
    if (income.next_pay_date) {
      payDate = parseISO(income.next_pay_date)
      // If the stored date is in the past, calculate from today
      if (isBefore(payDate, start)) {
        payDate = getNextPayDate(start, income.pay_frequency, income.pay_day)
      }
    } else {
      payDate = getNextPayDate(start, income.pay_frequency, income.pay_day)
    }

    // Generate all pay dates within the range
    while (isBefore(payDate, end) || isSameDay(payDate, end)) {
      if (isAfter(payDate, start) || isSameDay(payDate, start)) {
        incomeEvents.push({
          date: payDate,
          name: income.source,
          amount: income.amount,
        })
      }
      payDate = addDaysToPayFrequency(payDate, income.pay_frequency, income.pay_day)
    }
  }

  // Generate all bill events within the time range
  const billEvents: { date: Date; name: string; amount: number }[] = []
  for (const bill of bills) {
    if (!bill.is_active) continue

    let billDate = getNextBillDate(start, bill)
    if (!billDate) continue

    // Generate all bill dates within the range
    while (billDate && (isBefore(billDate, end) || isSameDay(billDate, end))) {
      if (isAfter(billDate, start) || isSameDay(billDate, start)) {
        billEvents.push({
          date: billDate,
          name: bill.name,
          amount: bill.amount,
        })
      }

      if (bill.is_one_off) break
      billDate = addDaysToFrequency(billDate, bill.frequency)
    }
  }

  // Build the timeline day by day
  const timeline: TimelineDay[] = []
  let runningBalance = startingBalance

  for (let i = 0; i <= days; i++) {
    const currentDate = addDays(start, i)
    const dateStr = format(currentDate, 'yyyy-MM-dd')

    // Get events for this day
    const dayIncomes = incomeEvents.filter(e => isSameDay(e.date, currentDate))
    const dayBills = billEvents.filter(e => isSameDay(e.date, currentDate))

    // Apply income (add to balance)
    for (const income of dayIncomes) {
      runningBalance += income.amount
    }

    // Apply bills (subtract from balance)
    for (const bill of dayBills) {
      runningBalance -= bill.amount
    }

    const events: TimelineEvent[] = [
      ...dayIncomes.map(e => ({ type: 'income' as const, name: e.name, amount: e.amount })),
      ...dayBills.map(e => ({ type: 'bill' as const, name: e.name, amount: e.amount })),
    ]

    timeline.push({
      date: dateStr,
      projectedBalance: Math.round(runningBalance * 100) / 100,
      events,
      isNegative: runningBalance < 0,
    })
  }

  return timeline
}

export function findLowestBalance(timeline: TimelineDay[]): { date: string; balance: number } | null {
  if (timeline.length === 0) return null

  let lowest = timeline[0]
  for (const day of timeline) {
    if (day.projectedBalance < lowest.projectedBalance) {
      lowest = day
    }
  }

  return { date: lowest.date, balance: lowest.projectedBalance }
}

export function hasNegativeBalance(timeline: TimelineDay[]): boolean {
  return timeline.some(day => day.isNegative)
}

export function getFirstNegativeDate(timeline: TimelineDay[]): string | null {
  const negativeDay = timeline.find(day => day.isNegative)
  return negativeDay?.date || null
}
