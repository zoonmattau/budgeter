import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BudgetOverview } from '@/components/dashboard/budget-overview'
import { BillsSummary } from '@/components/dashboard/bills-summary'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { QuickAddButton } from '@/components/transactions/quick-add-button'
import { InsightsTeaser } from '@/components/dashboard/quick-links'
import { NetWorthCard } from '@/components/dashboard/net-worth-card'
import { SmartPredictions } from '@/components/dashboard/smart-predictions'
import { PendingConfirmations } from '@/components/dashboard/pending-confirmations'
import { CreditLimitWarning } from '@/components/dashboard/credit-limit-warning'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { CashflowPreview } from '@/components/dashboard/cashflow-preview'
import { ScopeToggle } from '@/components/ui/scope-toggle'
import { format, startOfMonth, subMonths, addDays, subDays } from 'date-fns'
import type { ViewScope, HouseholdMember } from '@/lib/scope-context'
import type { MemberSpending } from '@/components/ui/member-breakdown'

interface DashboardPageProps {
  searchParams: Promise<{ scope?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const params = await searchParams
  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const lastMonthStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')

  // Calculate date range for predictions
  const today = new Date()
  const threeDaysAgo = subDays(today, 3)
  const sevenDaysFromNow = addDays(today, 7)

  // Fetch household membership
  const { data: membership } = await supabase
    .from('household_members')
    .select(`
      household_id,
      role,
      contribution_amount,
      contribution_frequency,
      households (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .single()

  const householdId = membership?.household_id || null
  const isInHousehold = Boolean(householdId)
  const scope: ViewScope = params.scope === 'household' && isInHousehold ? 'household' : 'personal'

  // Calculate user's monthly household contribution
  const frequencyMultiplierMap: Record<string, number> = {
    weekly: 4.33, fortnightly: 2.17, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12,
  }
  const userContributionAmount = membership?.contribution_amount ? Number(membership.contribution_amount) : 0
  const userContributionFreq = membership?.contribution_frequency || 'monthly'
  const userMonthlyContribution = userContributionAmount * (frequencyMultiplierMap[userContributionFreq] || 1)

  // Fetch household members if in household view
  let members: HouseholdMember[] = []
  let householdContributions: { id: string; source: string; amount: number; is_recurring: boolean; pay_frequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'; pay_day: number; next_pay_date: string }[] = []
  if (scope === 'household' && householdId) {
    const { data: householdMembers } = await supabase
      .from('household_members')
      .select(`
        user_id,
        role,
        contribution_amount,
        contribution_frequency,
        profiles (
          display_name
        )
      `)
      .eq('household_id', householdId)

    members = (householdMembers || []).map((m) => {
      const profile = m.profiles as unknown as { display_name: string | null } | null
      return {
        user_id: m.user_id,
        display_name: profile?.display_name || null,
        role: m.role as 'owner' | 'member',
      }
    })

    // Build contribution schedule for household cashflow
    householdContributions = (householdMembers || [])
      .filter(m => m.contribution_amount && Number(m.contribution_amount) > 0)
      .map(m => {
        const profile = m.profiles as unknown as { display_name: string | null } | null
        const name = profile?.display_name || 'Member'
        const freq = (m.contribution_frequency || 'monthly') as 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'
        return {
          id: `contrib-${m.user_id}`,
          source: `${name}'s contribution`,
          amount: Number(m.contribution_amount),
          is_recurring: true,
          pay_frequency: freq,
          pay_day: 1,
          next_pay_date: getNextContributionDate(freq),
        }
      })
  }

  // Fetch dashboard data in parallel - scope-aware queries
  const [
    { data: incomeEntries },
    { data: budgets },
    { data: transactions },
    { data: goals },
    { data: bills },
    { data: expenseCategories },
    { data: incomeCategories },
    { data: accounts },
    { data: predictions },
    { data: recurringIncome },
    { data: allBills },
    { data: budgetSettings },
    { data: lastMonthTransactions },
  ] = await Promise.all([
    // Income entries - scope aware
    scope === 'household' && householdId
      ? supabase
          .from('income_entries')
          .select('*')
          .eq('household_id', householdId)
          .eq('month', currentMonth)
      : supabase
          .from('income_entries')
          .select('*')
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .is('household_id', null),

    // Budgets - scope aware
    scope === 'household' && householdId
      ? supabase
          .from('budgets')
          .select('*, categories(*)')
          .eq('household_id', householdId)
          .eq('month', currentMonth)
      : supabase
          .from('budgets')
          .select('*, categories(*)')
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .is('household_id', null),

    // Transactions - scope aware with profile data for household view
    // Filter to current month but exclude future dates
    scope === 'household' && householdId
      ? supabase
          .from('transactions')
          .select('*, categories(*), profiles:user_id(display_name), accounts:account_id(name)')
          .eq('household_id', householdId)
          .gte('date', currentMonth)
          .lte('date', format(today, 'yyyy-MM-dd'))
          .order('date', { ascending: false })
      : supabase
          .from('transactions')
          .select('*, categories(*), accounts:account_id(name)')
          .eq('user_id', user.id)
          .is('household_id', null)
          .gte('date', currentMonth)
          .lte('date', format(today, 'yyyy-MM-dd'))
          .order('date', { ascending: false }),

    // Goals - scope aware
    scope === 'household' && householdId
      ? supabase
          .from('goals')
          .select('*')
          .eq('household_id', householdId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(3)
      : supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .is('household_id', null)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(3),

    // Bills - scope aware
    scope === 'household' && householdId
      ? supabase
          .from('bills')
          .select('*, categories(*)')
          .eq('household_id', householdId)
          .eq('is_active', true)
          .order('next_due', { ascending: true })
          .limit(4)
      : supabase
          .from('bills')
          .select('*, categories(*)')
          .eq('user_id', user.id)
          .is('household_id', null)
          .eq('is_active', true)
          .order('next_due', { ascending: true })
          .limit(4),

    // Categories (always personal for now)
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'expense'),

    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'income'),

    // Accounts - scope aware
    scope === 'household' && householdId
      ? supabase
          .from('accounts')
          .select('*')
          .eq('household_id', householdId)
      : supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id)
          .is('household_id', null),

    // Predictions (personal only for now)
    supabase
      .from('pattern_predictions')
      .select(`
        *,
        payment_patterns (
          id,
          name,
          normalized_name,
          typical_amount,
          frequency,
          confidence,
          category_id,
          categories:category_id (
            id,
            name,
            icon,
            color
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .gte('predicted_date', threeDaysAgo.toISOString().split('T')[0])
      .lte('predicted_date', sevenDaysFromNow.toISOString().split('T')[0])
      .order('predicted_date', { ascending: true }),

    // Recurring income for cash flow - scope aware
    scope === 'household' && householdId
      ? supabase
          .from('income_entries')
          .select('*')
          .eq('household_id', householdId)
          .eq('is_recurring', true)
      : supabase
          .from('income_entries')
          .select('*')
          .eq('user_id', user.id)
          .is('household_id', null)
          .eq('is_recurring', true),

    // All active bills for cash flow, sinking funds, and pending confirmations
    scope === 'household' && householdId
      ? supabase
          .from('bills')
          .select('*, categories(*)')
          .eq('household_id', householdId)
          .eq('is_active', true)
      : supabase
          .from('bills')
          .select('*, categories(*)')
          .eq('user_id', user.id)
          .is('household_id', null)
          .eq('is_active', true),

    // Budget settings (extra debt payment, etc.)
    scope === 'household' && householdId
      ? supabase
          .from('budget_settings')
          .select('*')
          .eq('household_id', householdId)
          .eq('month', currentMonth)
          .maybeSingle()
      : supabase
          .from('budget_settings')
          .select('*')
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .is('household_id', null)
          .maybeSingle(),

    // Last month's transactions up to same day — for trend comparison
    (() => {
      const sameDayLastMonth = format(
        new Date(subMonths(today, 1).getFullYear(), subMonths(today, 1).getMonth(), Math.min(today.getDate(), new Date(subMonths(today, 1).getFullYear(), subMonths(today, 1).getMonth() + 1, 0).getDate())),
        'yyyy-MM-dd'
      )
      return scope === 'household' && householdId
        ? supabase
            .from('transactions')
            .select('amount, type')
            .eq('household_id', householdId)
            .gte('date', lastMonthStart)
            .lte('date', sameDayLastMonth)
        : supabase
            .from('transactions')
            .select('amount, type')
            .eq('user_id', user.id)
            .is('household_id', null)
            .gte('date', lastMonthStart)
            .lte('date', sameDayLastMonth)
    })(),
  ])

  const totalIncome = incomeEntries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0

  // For household budgets: deduplicate by category NAME (not ID) since each member
  // has their own categories with different IDs. Keep the most recent per name.
  const deduplicatedBudgets = scope === 'household'
    ? Object.values(
        (budgets || []).reduce((acc, b) => {
          const catName = b.categories?.name?.toLowerCase() || b.category_id
          if (!acc[catName] || b.updated_at > acc[catName].updated_at) {
            acc[catName] = b
          }
          return acc
        }, {} as Record<string, NonNullable<typeof budgets>[0]>)
      )
    : budgets || []
  const categoryAllocated = deduplicatedBudgets.reduce((sum, b) => sum + Number(b.allocated), 0)

  // Calculate fixed costs to match budget builder
  const frequencyToMonthly: Record<string, number> = {
    weekly: 4.33, fortnightly: 2.17, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12,
  }
  const debtAccounts = accounts?.filter(a =>
    (a.type === 'credit' || a.type === 'credit_card' || a.type === 'debt' || a.type === 'loan') && Math.abs(Number(a.balance) || 0) > 0
  ) || []
  const monthlyDebtPayments = debtAccounts.reduce((total, a) => {
    if (!a.minimum_payment) return total
    const multiplier = frequencyToMonthly[a.payment_frequency || 'monthly'] || 1
    return total + (Number(a.minimum_payment) * multiplier)
  }, 0)
  const monthlySinkingFunds = (allBills || [])
    .filter(b => b.is_active && !b.is_one_off && (b.frequency === 'quarterly' || b.frequency === 'yearly'))
    .reduce((sum, b) => sum + Number(b.amount) / (b.frequency === 'yearly' ? 12 : 3), 0)
  const extraDebtPayment = Number(budgetSettings?.extra_debt_payment) || 0

  const householdContributionCost = scope === 'personal' && householdId ? userMonthlyContribution : 0
  const totalAllocated = categoryAllocated + monthlyDebtPayments + monthlySinkingFunds + extraDebtPayment + householdContributionCost
  const totalSpent = transactions
    ?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0

  const lastMonthSpentSamePoint = lastMonthTransactions
    ?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0

  // Calculate member spending breakdown for household view
  let memberBreakdown: MemberSpending[] = []
  if (scope === 'household' && transactions) {
    const spendingByUser = new Map<string, number>()
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const current = spendingByUser.get(t.user_id) || 0
        spendingByUser.set(t.user_id, current + Number(t.amount))
      })

    memberBreakdown = members.map(member => ({
      userId: member.user_id,
      displayName: member.user_id === user.id ? 'You' : member.display_name,
      amount: spendingByUser.get(member.user_id) || 0,
    }))
  }

  // Calculate net worth
  const totalAssets = accounts?.filter(a => a.is_asset).reduce((sum, a) => sum + Number(a.balance), 0) || 0
  const totalLiabilities = accounts?.filter(a => !a.is_asset).reduce((sum, a) => sum + Math.abs(Number(a.balance) || 0), 0) || 0
  const netWorth = totalAssets - totalLiabilities

  // Get credit cards for expense linking
  const creditCards = accounts?.filter(a => a.type === 'credit' || a.type === 'credit_card') || []

  // Get investment accounts for investment contributions
  const investmentAccounts = accounts?.filter(a => a.type === 'investment') || []

  // Get bank accounts for income deposits and expense payments
  const bankAccounts = accounts?.filter(a => a.type === 'bank' || a.type === 'cash') || []

  // Compute pending bills and income (due today or overdue)
  const todayStr = format(today, 'yyyy-MM-dd')
  const pendingBills = (allBills || []).filter(b => b.next_due <= todayStr)
  const pendingIncome = (recurringIncome || []).filter(i => i.next_pay_date && i.next_pay_date <= todayStr)

  // Create/update net worth snapshot if user has accounts (personal only)
  if (scope === 'personal' && accounts && accounts.length > 0) {
    const { error: snapshotError } = await supabase.rpc('create_net_worth_snapshot', { p_user_id: user.id })
    if (snapshotError) {
      console.error('Error creating net worth snapshot:', snapshotError)
    }
  }

  // Auto-complete debt payoff goals when linked account balance reaches 0 (personal scope only)
  if (scope === 'personal' && goals && accounts) {
    const debtPayoffGoals = goals.filter(g => g.goal_type === 'debt_payoff' && g.linked_account_id)
    const updates = debtPayoffGoals.map(async (goal) => {
      const linkedAccount = accounts.find(a => a.id === goal.linked_account_id)
      if (!linkedAccount) return

      const currentAmount = Number(goal.current_amount) || 0
      const targetAmount = Number(goal.target_amount) || 0
      const startingAmount = Number(goal.starting_amount) || 0
      const accountDebt = Math.abs(Number(linkedAccount.balance) || 0)
      const totalDebt = Math.max(Math.abs(targetAmount), Math.abs(startingAmount), accountDebt)
      const paidOff = Math.max(0, totalDebt - accountDebt)

      if (accountDebt <= 0.01 && goal.status !== 'completed') {
        const { error } = await supabase
          .from('goals')
          .update({
            status: 'completed',
            target_amount: totalDebt,
            starting_amount: totalDebt,
            current_amount: totalDebt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', goal.id)
          .eq('status', 'active')

        if (error) console.error('Error completing goal:', error)
      } else {
        if (Math.abs(paidOff - currentAmount) > 0.01) {
          const { error } = await supabase
            .from('goals')
            .update({
              target_amount: totalDebt,
              starting_amount: totalDebt,
              current_amount: paidOff,
              updated_at: new Date().toISOString(),
            })
            .eq('id', goal.id)

          if (error) console.error('Error updating goal progress:', error)
        }
      }
    })

    await Promise.all(updates)
  }

  // Auto-track net worth milestone goals (personal scope only)
  // Fetch ALL milestone goals separately (dashboard query is limited to 3 goals)
  if (scope === 'personal') {
    const { data: milestoneGoals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .is('household_id', null)
      .eq('goal_type', 'net_worth_milestone')

    if (milestoneGoals && milestoneGoals.length > 0) {
      const milestoneUpdates = milestoneGoals.map(async (goal) => {
        const targetAmount = Number(goal.target_amount) || 0
        const currentAmount = Number(goal.current_amount) || 0
        const shouldBeCompleted = netWorth >= targetAmount
        const desiredStatus = shouldBeCompleted ? 'completed' : 'active'
        const desiredCurrentAmount = shouldBeCompleted ? targetAmount : netWorth

        if (goal.status !== desiredStatus || Math.abs(desiredCurrentAmount - currentAmount) > 0.01) {
          // Keep milestone status/progress in sync with live net worth.
          const { error } = await supabase
            .from('goals')
            .update({
              status: desiredStatus,
              current_amount: desiredCurrentAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', goal.id)

          if (error) console.error('Error syncing milestone goal:', error)
        }
      })

      await Promise.all(milestoneUpdates)
    }
  }

  // Cast transactions for components
  const typedTransactions = (transactions || []) as (typeof transactions extends (infer T)[] | null ? T & { profiles?: { display_name: string | null } | null } : never)[]

  // Calculate daily spending stats for insights teaser
  // Discretionary budget excludes fixed costs (rent, bills, housing, insurance)
  const fixedCostKeywords = ['rent', 'mortgage', 'housing', 'home loan', 'bills', 'utilities', 'electricity', 'gas', 'water', 'internet', 'phone', 'insurance', 'household', 'contribution']
  const discretionaryBudgets = budgets?.filter(b => {
    const name = (b.categories?.name || '').toLowerCase()
    return !fixedCostKeywords.some(k => name.includes(k))
  }) || []
  const discretionaryAllocated = discretionaryBudgets.reduce((sum, b) => sum + Number(b.allocated), 0)
  // Build fixed category IDs from both budgets AND expense categories so that
  // household/contribution transactions are excluded from discretionary spending
  // even if the user doesn't have a budget allocation for that category
  const fixedBudgetCategoryIds = budgets?.filter(b => {
    const name = (b.categories?.name || '').toLowerCase()
    return fixedCostKeywords.some(k => name.includes(k))
  }).map(b => b.category_id) || []
  const fixedExpenseCategoryIds = expenseCategories?.filter(c => {
    const name = (c.name || '').toLowerCase()
    return fixedCostKeywords.some(k => name.includes(k))
  }).map(c => c.id) || []
  const fixedCategoryIds = new Set([...fixedBudgetCategoryIds, ...fixedExpenseCategoryIds])
  const discretionarySpent = transactions
    ?.filter(t => t.type === 'expense' && !fixedCategoryIds.has(t.category_id))
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0

  // Build fixed costs breakdown for tooltip
  const fixedCostItems: { name: string; amount: number }[] = []
  budgets?.filter(b => {
    const name = (b.categories?.name || '').toLowerCase()
    return fixedCostKeywords.some(k => name.includes(k))
  }).forEach(b => {
    fixedCostItems.push({ name: b.categories?.name || 'Unknown', amount: Number(b.allocated) })
  })
  const totalDebtPayments = monthlyDebtPayments + extraDebtPayment
  if (totalDebtPayments > 0) fixedCostItems.push({ name: 'Debt repayments', amount: Math.round(totalDebtPayments) })
  if (monthlySinkingFunds > 0) fixedCostItems.push({ name: 'Sinking funds', amount: Math.round(monthlySinkingFunds) })
  if (householdContributionCost > 0) fixedCostItems.push({ name: 'Household contribution', amount: Math.round(householdContributionCost) })

  const daysInMonth = new Date().getDate()
  const dailyAverage = daysInMonth > 0 ? discretionarySpent / daysInMonth : 0
  const dailyTarget = discretionaryAllocated / 30

  // Find top spending category
  const spendingByCategory = new Map<string, { name: string; amount: number; color: string }>()
  typedTransactions
    .filter(t => t.type === 'expense' && t.categories)
    .forEach(t => {
      const cat = t.categories!
      const current = spendingByCategory.get(cat.id) || { name: cat.name, amount: 0, color: cat.color }
      current.amount += Number(t.amount)
      spendingByCategory.set(cat.id, current)
    })
  const topCategory = Array.from(spendingByCategory.values())
    .sort((a, b) => b.amount - a.amount)[0] || null

  return (
    <div className="space-y-6 pb-20">
      {/* Greeting with Scope Toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            {getGreeting()}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
        {isInHousehold && <ScopeToggle />}
      </div>

      {/* Budget Overview Card */}
      <BudgetOverview
        totalIncome={totalIncome}
        totalAllocated={totalAllocated}
        totalSpent={totalSpent}
        discretionaryAllocated={discretionaryAllocated}
        discretionarySpent={discretionarySpent}
        fixedCostItems={fixedCostItems}
        scope={scope}
        memberBreakdown={memberBreakdown}
        lastMonthSpentSamePoint={lastMonthSpentSamePoint}
      />

      {/* Net Worth & Goals Row */}
      <div className="grid grid-cols-2 gap-3">
        <NetWorthCard
          netWorth={netWorth}
          totalAssets={totalAssets}
          totalLiabilities={totalLiabilities}
        />
        <Link
          href={`/goals${(goals || []).length === 0 ? '/new' : ''}`}
          className={`card-hover block p-4 ${
            (goals || []).length > 0
              ? 'bg-gradient-to-br from-bloom-50 to-lavender-50'
              : 'bg-gradient-to-br from-bloom-50 to-sprout-50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Goals</p>
            {(goals || []).length > 0 && (
              <span className="text-xs text-gray-400">{(goals || []).length} active</span>
            )}
          </div>
          {(goals || []).length > 0 ? (
            <div className="space-y-2">
              {(goals || []).slice(0, 2).map((goal) => {
                const isDebtPayoff = goal.goal_type === 'debt_payoff'
                const target = Number(goal.target_amount) || 0
                const current = Number(goal.current_amount) || 0
                const start = Number(goal.starting_amount) || 0
                const progress = isDebtPayoff
                  ? (() => {
                      const totalDebt = Math.max(Math.abs(target), Math.abs(start), current < 0 ? Math.abs(current) : 0)
                      if (totalDebt <= 0) return 0
                      const remaining = current < 0
                        ? Math.abs(current)
                        : target > 0
                          ? Math.max(0, Math.abs(target) - current)
                          : Math.max(0, totalDebt - current)
                      return Math.max(0, Math.min(((totalDebt - remaining) / totalDebt) * 100, 100))
                    })()
                  : target > 0
                    ? (current / target) * 100
                    : 0
                return (
                  <div key={goal.id}>
                    <p className="text-xs text-gray-700 truncate">{goal.name}</p>
                    <div className="h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          goal.goal_type === 'debt_payoff'
                            ? 'bg-gradient-to-r from-red-400 to-red-500'
                            : goal.goal_type === 'net_worth_milestone'
                              ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                              : 'bg-gradient-to-r from-sprout-400 to-sprout-500'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {(goals || []).length > 2 && (
                <p className="text-[10px] text-gray-400">+{(goals || []).length - 2} more</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center mt-1">
              <span className="text-2xl mb-1">🌱</span>
              <p className="text-xs font-medium text-bloom-600">Start a goal</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Save for what matters</p>
            </div>
          )}
        </Link>
      </div>

      {/* Cash Flow Preview */}
      <CashflowPreview
        accounts={accounts || []}
        incomeEntries={scope === 'household' ? householdContributions : (recurringIncome || [])}
        bills={allBills || []}
        transactions={scope === 'household' ? [] : typedTransactions.map(t => ({
          id: t.id,
          amount: Number(t.amount),
          date: t.date,
          type: t.type,
          description: t.description,
        }))}
      />

      {/* Credit Limit Warning */}
      <CreditLimitWarning creditCards={creditCards} />

      {/* Insights Teaser Carousel */}
      <InsightsTeaser
        totalSpent={totalSpent}
        totalAllocated={totalAllocated}
        totalIncome={totalIncome}
        dailyAverage={dailyAverage}
        dailyTarget={dailyTarget}
        discretionaryAllocated={discretionaryAllocated}
        discretionarySpent={discretionarySpent}
        topCategory={topCategory}
        transactions={typedTransactions}
        daysInMonth={daysInMonth}
      />

      {/* Activity Feed - only shown in household view */}
      {scope === 'household' && (
        <section>
          <h2 className="font-display font-semibold text-gray-900 mb-3">Household Activity</h2>
          <ActivityFeed
            transactions={typedTransactions.slice(0, 10)}
            members={members}
            currentUserId={user.id}
          />
        </section>
      )}

      {/* Smart Predictions */}
      <SmartPredictions
        predictions={predictions || []}
        expenseCategories={expenseCategories || []}
      />

      {/* Pending Confirmations */}
      <PendingConfirmations
        pendingBills={pendingBills}
        pendingIncome={pendingIncome}
        bankAccounts={bankAccounts}
        creditCards={creditCards}
        incomeCategories={incomeCategories || []}
      />

      {/* Bills & Subscriptions Summary */}
      <BillsSummary
        bills={bills || []}
        debtAccounts={accounts?.filter(a =>
          (a.type === 'credit' || a.type === 'credit_card' || a.type === 'loan' || a.type === 'debt') &&
          Math.abs(Number(a.balance) || 0) > 0 &&
          a.due_date &&
          a.minimum_payment
        ) || []}
      />

      {/* Recent Transactions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-gray-900">Recent Transactions</h2>
          <Link href="/transactions" className="text-sm text-bloom-600 hover:text-bloom-700 font-medium">
            See all
          </Link>
        </div>
        <RecentTransactions
          transactions={typedTransactions.slice(0, 5)}
          categories={[...(expenseCategories || []), ...(incomeCategories || [])]}
          creditCards={creditCards}
          bankAccounts={bankAccounts}
          showMemberBadge={scope === 'household'}
          members={members}
          currentUserId={user.id}
        />
      </section>

      {/* Quick Add FAB */}
      <QuickAddButton expenseCategories={expenseCategories || []} incomeCategories={incomeCategories || []} creditCards={creditCards} investmentAccounts={investmentAccounts} bankAccounts={bankAccounts} debtAccounts={accounts?.filter(a => a.type === 'credit' || a.type === 'credit_card' || a.type === 'loan' || a.type === 'debt') || []} />
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getNextContributionDate(frequency: string): string {
  const today = new Date()
  const next = new Date(today)
  // Default to next 1st of the month as a starting anchor
  next.setDate(1)
  if (next <= today) {
    switch (frequency) {
      case 'weekly':
        next.setDate(today.getDate() + (7 - today.getDay()))
        break
      case 'fortnightly':
        next.setDate(today.getDate() + 14 - (today.getDate() % 14))
        break
      case 'quarterly':
        next.setMonth(next.getMonth() + 3)
        break
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1)
        break
      default: // monthly
        next.setMonth(next.getMonth() + 1)
    }
  }
  return format(next, 'yyyy-MM-dd')
}
