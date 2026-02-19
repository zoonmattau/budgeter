import { createClient } from '@/lib/supabase/server'
import { format, subDays, startOfMonth, subMonths } from 'date-fns'
import { InsightsClient } from '@/components/charts/insights-client'
import { ScopeToggle } from '@/components/ui/scope-toggle'
import type { ViewScope } from '@/lib/scope-context'

interface InsightsPageProps {
  searchParams: Promise<{ scope?: string }>
}

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const params = await searchParams

  // Determine scope
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single()

  const householdId = membership?.household_id || null
  const isInHousehold = Boolean(householdId)
  const scope: ViewScope = params.scope === 'household' && isInHousehold ? 'household' : 'personal'
  const isHousehold = scope === 'household' && householdId

  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const today = format(new Date(), 'yyyy-MM-dd')
  const oneYearAgo = format(subDays(new Date(), 365), 'yyyy-MM-dd')

  // Get last 12 months for income history
  const months: string[] = []
  for (let i = 11; i >= 0; i--) {
    months.push(format(startOfMonth(subMonths(new Date(), i)), 'yyyy-MM-dd'))
  }

  // Fetch all data needed for charts - scope aware
  const [
    { data: transactions },
    { data: budgets },
    { data: incomeEntries },
    { data: allIncomeEntries },
    { data: netWorthSnapshots },
    { data: investmentAccounts },
    { data: bills },
  ] = await Promise.all([
    isHousehold
      ? supabase
          .from('transactions')
          .select('*, categories(*)')
          .eq('household_id', householdId)
          .gte('date', oneYearAgo)
          .lte('date', today)
          .order('date', { ascending: true })
      : supabase
          .from('transactions')
          .select('*, categories(*)')
          .eq('user_id', user.id)
          .is('household_id', null)
          .gte('date', oneYearAgo)
          .lte('date', today)
          .order('date', { ascending: true }),
    isHousehold
      ? supabase
          .from('budgets')
          .select('*, categories(*)')
          .eq('household_id', householdId)
          .eq('month', currentMonth)
      : supabase
          .from('budgets')
          .select('*, categories(*)')
          .eq('user_id', user.id)
          .is('household_id', null)
          .eq('month', currentMonth),
    isHousehold
      ? supabase
          .from('income_entries')
          .select('*')
          .eq('household_id', householdId)
          .eq('month', currentMonth)
      : supabase
          .from('income_entries')
          .select('*')
          .eq('user_id', user.id)
          .is('household_id', null)
          .eq('month', currentMonth),
    // Get income for last 12 months
    isHousehold
      ? supabase
          .from('income_entries')
          .select('*')
          .eq('household_id', householdId)
          .in('month', months)
      : supabase
          .from('income_entries')
          .select('*')
          .eq('user_id', user.id)
          .is('household_id', null)
          .in('month', months),
    // Net worth snapshots (always personal)
    supabase
      .from('net_worth_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: true })
      .limit(24),
    // Investment accounts (always personal)
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .is('household_id', null)
      .eq('type', 'investment'),
    // Bills for recurring tracking
    isHousehold
      ? supabase
          .from('bills')
          .select('*, categories(*)')
          .eq('household_id', householdId)
      : supabase
          .from('bills')
          .select('*, categories(*)')
          .eq('user_id', user.id)
          .is('household_id', null),
  ])

  const totalIncome = incomeEntries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
  const totalBudgeted = budgets?.reduce((sum, b) => sum + Number(b.allocated), 0) || 0

  // Aggregate income by month for history chart
  const incomeByMonth = months.map(month => {
    const monthEntries = allIncomeEntries?.filter(e => e.month === month) || []
    const total = monthEntries.reduce((sum, e) => sum + Number(e.amount), 0)
    // Use T00:00:00 to avoid UTC parsing shifting the date to the previous month
    const monthDate = new Date(month + 'T00:00:00')
    return {
      month,
      label: format(monthDate, 'MMM yyyy'),
      shortLabel: format(monthDate, 'MMM'),
      amount: total,
    }
  })

  // Calculate total lifetime income
  const totalLifetimeIncome = incomeByMonth.reduce((sum, m) => sum + m.amount, 0)

  // Process net worth for investment tracking
  const netWorthHistory = (netWorthSnapshots || []).slice(-12).map(s => ({
    date: s.snapshot_date,
    label: format(new Date(s.snapshot_date + 'T00:00:00'), 'MMM yyyy'),
    shortLabel: format(new Date(s.snapshot_date + 'T00:00:00'), 'MMM'),
    netWorth: Number(s.net_worth),
    totalAssets: Number(s.total_assets),
  }))

  // Current investments
  const currentInvestments = investmentAccounts?.reduce((sum, a) => sum + Number(a.balance), 0) || 0

  // Category trends: compare this month vs 3-month average
  const thisMonthStr = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const threeMonthsAgo = format(startOfMonth(subMonths(new Date(), 3)), 'yyyy-MM-dd')

  const thisMonthTx = (transactions || []).filter(t => t.date >= thisMonthStr && t.type === 'expense')
  const prevThreeMonthTx = (transactions || []).filter(t => t.date >= threeMonthsAgo && t.date < thisMonthStr && t.type === 'expense')

  // Sum by category for this month and prev 3 months
  const thisMonthByCategory = new Map<string, { name: string; amount: number }>()
  for (const t of thisMonthTx) {
    if (!t.categories) continue
    const existing = thisMonthByCategory.get(t.categories.name) || { name: t.categories.name, amount: 0 }
    existing.amount += Number(t.amount)
    thisMonthByCategory.set(t.categories.name, existing)
  }

  const prevByCategory = new Map<string, number>()
  for (const t of prevThreeMonthTx) {
    if (!t.categories) continue
    const existing = prevByCategory.get(t.categories.name) || 0
    prevByCategory.set(t.categories.name, existing + Number(t.amount))
  }

  // Build trend list: categories where this month deviates >20% from 3-month avg
  const categoryTrends = Array.from(thisMonthByCategory.entries())
    .map(([name, { amount }]) => {
      const prevTotal = prevByCategory.get(name) || 0
      const prevAvg = prevTotal / 3
      const pctChange = prevAvg > 0 ? Math.round(((amount - prevAvg) / prevAvg) * 100) : null
      return { name, amount, prevAvg, pctChange }
    })
    .filter(t => t.pctChange !== null && Math.abs(t.pctChange) >= 20)
    .sort((a, b) => Math.abs(b.pctChange!) - Math.abs(a.pctChange!))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Insights</h1>
          <p className="text-gray-500 text-sm mt-1">Understand your financial patterns</p>
        </div>
        <ScopeToggle />
      </div>

      {/* Category trends callout */}
      {categoryTrends.length > 0 && (
        <div className="card">
          <h3 className="font-display font-semibold text-gray-900 mb-3">Spending Trends</h3>
          <div className="space-y-2">
            {categoryTrends.map(trend => (
              <div key={trend.name} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{trend.name}</p>
                  <p className="text-xs text-gray-400">3-month avg: ${trend.prevAvg.toFixed(0)}/mo</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">${trend.amount.toFixed(0)}</p>
                  <p className={`text-xs font-medium ${trend.pctChange! > 0 ? 'text-coral-500' : 'text-sprout-600'}`}>
                    {trend.pctChange! > 0 ? '▲' : '▼'} {Math.abs(trend.pctChange!)}% vs avg
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <InsightsClient
        transactions={transactions || []}
        budgets={budgets || []}
        totalIncome={totalIncome}
        totalBudgeted={totalBudgeted}
        incomeByMonth={incomeByMonth}
        totalLifetimeIncome={totalLifetimeIncome}
        netWorthHistory={netWorthHistory}
        currentInvestments={currentInvestments}
        investmentAccounts={investmentAccounts || []}
        bills={bills || []}
      />
    </div>
  )
}
