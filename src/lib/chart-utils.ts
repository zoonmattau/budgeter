import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns'
import type { Tables } from './database.types'

type Transaction = Tables<'transactions'> & {
  categories: Tables<'categories'> | null
}

type Budget = Tables<'budgets'> & {
  categories: Tables<'categories'> | null
}

// Aggregate spending by category
export function aggregateSpendingByCategory(
  transactions: Transaction[],
  limit = 5
): { name: string; value: number; color: string; count: number; percent?: number }[] {
  const categoryMap = new Map<string, { name: string; value: number; color: string; count: number }>()

  const expenseTransactions = transactions.filter((t) => t.type === 'expense')
  const totalSpent = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0)

  expenseTransactions.forEach((t) => {
    const categoryId = t.category_id
    const existing = categoryMap.get(categoryId)

    if (existing) {
      existing.value += Number(t.amount)
      existing.count += 1
    } else {
      categoryMap.set(categoryId, {
        name: t.categories?.name || 'Other',
        value: Number(t.amount),
        color: t.categories?.color || '#94a3b8',
        count: 1,
      })
    }
  })

  return Array.from(categoryMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map(item => ({
      ...item,
      percent: totalSpent > 0 ? (item.value / totalSpent) * 100 : 0,
    }))
}

// Get daily spending over a period
export function getDailySpending(
  transactions: Transaction[],
  days: number
): { date: string; amount: number; label: string }[] {
  const endDate = startOfDay(new Date())
  const startDate = subDays(endDate, days - 1)

  const dateRange = eachDayOfInterval({ start: startDate, end: endDate })

  const spendingByDate = new Map<string, number>()
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const dateKey = t.date
      spendingByDate.set(dateKey, (spendingByDate.get(dateKey) || 0) + Number(t.amount))
    })

  return dateRange.map((date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return {
      date: dateKey,
      amount: spendingByDate.get(dateKey) || 0,
      label: format(date, 'MMM d'),
    }
  })
}

// Get category spending vs budget
export function getCategoryBudgetComparison(
  transactions: Transaction[],
  budgets: Budget[]
): { name: string; categoryId: string; spent: number; budgeted: number; color: string }[] {
  const spentByCategory = new Map<string, number>()

  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      spentByCategory.set(
        t.category_id,
        (spentByCategory.get(t.category_id) || 0) + Number(t.amount)
      )
    })

  return budgets
    .map((b) => ({
      name: b.categories?.name || 'Unknown',
      categoryId: b.category_id,
      spent: spentByCategory.get(b.category_id) || 0,
      budgeted: Number(b.allocated),
      color: b.categories?.color || '#94a3b8',
    }))
    .filter(b => b.budgeted > 0 || b.spent > 0)
    .sort((a, b) => b.budgeted - a.budgeted)
}

// Calculate average daily spending
export function getAverageDailySpending(
  transactions: Transaction[],
  days: number
): number {
  const dailySpending = getDailySpending(transactions, days)
  const total = dailySpending.reduce((sum, d) => sum + d.amount, 0)
  return total / days
}

// Get spending trend (up, down, stable)
export function getSpendingTrend(
  transactions: Transaction[],
  days: number
): 'up' | 'down' | 'stable' {
  const dailySpending = getDailySpending(transactions, days)

  if (dailySpending.length < 2) return 'stable'

  const midpoint = Math.floor(dailySpending.length / 2)
  const firstHalf = dailySpending.slice(0, midpoint)
  const secondHalf = dailySpending.slice(midpoint)

  const firstAvg = firstHalf.reduce((sum, d) => sum + d.amount, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.amount, 0) / secondHalf.length

  const percentChange = ((secondAvg - firstAvg) / (firstAvg || 1)) * 100

  if (percentChange > 10) return 'up'
  if (percentChange < -10) return 'down'
  return 'stable'
}
