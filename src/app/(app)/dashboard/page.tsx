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
import { PlayerStats } from '@/components/dashboard/player-stats'
import { syncWeeklyChallenges } from '@/app/actions/challenges'
import { PaydayModal } from '@/components/dashboard/payday-modal'
import { ScopeToggle } from '@/components/ui/scope-toggle'
import { formatCurrency } from '@/lib/utils'
import { format, startOfMonth, subMonths, addDays, subDays, startOfISOWeek } from 'date-fns'
import type { ViewScope, HouseholdMember } from '@/lib/scope-context'
import type { MemberSpending } from '@/components/ui/member-breakdown'
import { calculateStreakFromTransactions } from '@/lib/gamification'
import { awardXP, syncStreak, checkAndUnlockAchievements } from '@/app/actions/gamification'

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
  const { data: userContributionCommit } = householdId
    ? await supabase
        .from('income_entries')
        .select('amount')
        .eq('household_id', householdId)
        .eq('month', currentMonth)
        .eq('source', `Contribution:${user.id}`)
        .maybeSingle()
    : { data: null }
  const userCommittedMonthlyContribution = Number(userContributionCommit?.amount) || 0

  // Fetch household members if in household view
  let members: HouseholdMember[] = []
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
    { data: userStats },
    { count: achievementCount },
    { data: streakTransactions },
    { data: weekTransactions },
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

    // User stats for gamification
    supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),

    // Achievement count
    supabase
      .from('achievements')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),

    // Streak: personal expense dates for last 35 days (covers cross-month streaks)
    supabase
      .from('transactions')
      .select('date, type')
      .eq('user_id', user.id)
      .is('household_id', null)
      .eq('type', 'expense')
      .gte('date', format(subDays(today, 35), 'yyyy-MM-dd'))
      .lte('date', format(today, 'yyyy-MM-dd')),

    // This week's transactions for challenge progress (personal only)
    supabase
      .from('transactions')
      .select('date, type, amount')
      .eq('user_id', user.id)
      .is('household_id', null)
      .gte('date', format(startOfISOWeek(today), 'yyyy-MM-dd'))
      .lte('date', format(today, 'yyyy-MM-dd')),
  ])

  const totalIncome = incomeEntries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0

  // Gamification: calculate streak using a dedicated 35-day window so cross-month
  // streaks are counted correctly (current month query would reset to 0 on the 1st).
  // Personal scope only — streak is a personal metric.
  const currentStreak = calculateStreakFromTransactions(streakTransactions || [])

  // Streak at risk: streak exists, it's after 6pm, and no transaction logged today yet
  const todayDateStr = format(today, 'yyyy-MM-dd')
  const hasLoggedToday = (streakTransactions || []).some(t => t.date === todayDateStr)
  const streakAtRisk = scope === 'personal' && currentStreak > 0 && today.getHours() >= 18 && !hasLoggedToday

  // Persist streak to DB and check streak achievements
  if (scope === 'personal') {
    void syncStreak(user.id, currentStreak)
    void checkAndUnlockAchievements(user.id, { streak: currentStreak })

    // Daily login XP: award 5 XP once per day (check if updated_at is today)
    const lastUpdated = userStats?.updated_at
      ? format(new Date(userStats.updated_at), 'yyyy-MM-dd')
      : null
    if (lastUpdated !== todayDateStr) {
      void awardXP(user.id, 5)
    }
  }

  // Sync weekly challenges (personal only — challenges are a personal metric)
  const activeChallenges = scope === 'personal'
    ? await syncWeeklyChallenges(user.id, weekTransactions || [], currentStreak)
    : []

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

  const householdContributionCost = scope === 'personal' && householdId ? userCommittedMonthlyContribution : 0
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

  // Check financial milestone achievements (needs totalSpent, totalAllocated, netWorth)
  if (scope === 'personal') {
    const completedGoalsCount = (goals || []).filter(g => g.status === 'completed').length
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : 0
    const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const isMonthEnd = today.getDate() === daysInCurrentMonth
    void checkAndUnlockAchievements(user.id, {
      goalsCompleted: completedGoalsCount,
      netWorthPositive: netWorth > 0,
      savingsRate: totalIncome > 0 ? savingsRate : undefined,
      underBudget: isMonthEnd && totalIncome > 0 && totalSpent < totalAllocated ? true : undefined,
    })
  }

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
        else {
          void awardXP(user.id, 100)
          void checkAndUnlockAchievements(user.id, { goalCompleted: true })
        }
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
          else if (shouldBeCompleted && goal.status !== 'completed') {
            void awardXP(user.id, 100)
            void checkAndUnlockAchievements(user.id, { goalCompleted: true })
          }
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

      {/* Savings rate pill — only shown in personal scope when income exists */}
      {scope === 'personal' && totalIncome > 0 && (() => {
        const saved = totalIncome - totalSpent
        const savingsRate = Math.round((saved / totalIncome) * 100)
        const isPositive = savingsRate > 0
        return (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
            isPositive ? 'bg-sprout-50 text-sprout-700' : 'bg-coral-50 text-coral-700'
          }`}>
            <span>{isPositive ? '📈' : '📉'}</span>
            <span>
              {isPositive
                ? `You're saving ${savingsRate}% of income this month — ${formatCurrency(saved)} saved so far`
                : `Spending ${Math.abs(savingsRate)}% more than income this month`}
            </span>
          </div>
        )
      })()}

      {/* Payday flow — shown when no income logged this month and recurring sources exist */}
      {scope === 'personal' && totalIncome === 0 && (recurringIncome || []).length > 0 && (
        <PaydayModal
          recurringIncome={recurringIncome || []}
          userId={user.id}
        />
      )}

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
                const debtTotals = (() => {
                  const totalDebt = Math.max(Math.abs(target), Math.abs(start), current < 0 ? Math.abs(current) : 0)
                  if (totalDebt <= 0) return { totalDebt: 0, paidOff: 0, remaining: 0 }
                  const remaining = current < 0
                    ? Math.abs(current)
                    : target > 0
                      ? Math.max(0, Math.abs(target) - current)
                      : Math.max(0, totalDebt - current)
                  const paidOff = Math.max(0, totalDebt - remaining)
                  return { totalDebt, paidOff, remaining }
                })()
                const progress = isDebtPayoff
                  ? (debtTotals.totalDebt > 0 ? Math.max(0, Math.min((debtTotals.paidOff / debtTotals.totalDebt) * 100, 100)) : 0)
                  : target > 0
                    ? Math.max(0, Math.min((current / target) * 100, 100))
                    : 0
                const progressCurrentAmount = isDebtPayoff ? debtTotals.paidOff : current
                const progressTargetAmount = isDebtPayoff ? debtTotals.totalDebt : target
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-700 truncate">{goal.name}</p>
                      <p className="text-[10px] text-gray-500 whitespace-nowrap">{Math.round(progress)}%</p>
                    </div>
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
                    <p className="text-[10px] text-gray-500 mt-1">
                      {formatCurrency(progressCurrentAmount)} / {formatCurrency(progressTargetAmount)}
                    </p>
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

      {/* Plant + Challenges row */}
      {scope === 'personal' && (
        <div className="grid grid-cols-2 gap-3">
          <PlayerStats
            totalXp={userStats?.total_xp ?? 0}
            streak={currentStreak}
            achievementCount={achievementCount ?? 0}
            streakAtRisk={streakAtRisk}
          />
          {activeChallenges.length > 0 ? (() => {
            const completed = activeChallenges.filter(c => c.status === 'completed').length
            const total = activeChallenges.length
            return (
              <Link
                href="/achievements"
                className="card card-hover flex flex-col justify-between bg-gradient-to-br from-coral-50 to-amber-50 border border-coral-100"
              >
                <div className="w-8 h-8 rounded-xl bg-coral-100 flex items-center justify-center mb-2">
                  <span className="text-base">⚡</span>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-coral-600 uppercase tracking-wide mb-0.5">Challenges</p>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">
                    {completed === total ? 'All done!' : `${completed}/${total} done`}
                  </p>
                </div>
              </Link>
            )
          })() : (
            <Link
              href="/achievements"
              className="card card-hover flex flex-col justify-between bg-gradient-to-br from-coral-50 to-amber-50 border border-coral-100"
            >
              <div className="w-8 h-8 rounded-xl bg-coral-100 flex items-center justify-center mb-2">
                <span className="text-base">⚡</span>
              </div>
              <div>
                <p className="text-[10px] font-medium text-coral-600 uppercase tracking-wide mb-0.5">Challenges</p>
                <p className="text-sm font-semibold text-gray-900 leading-tight">No active challenges</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Cash Flow Preview */}
      <CashflowPreview
        accounts={accounts || []}
        incomeEntries={recurringIncome || []}
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
        streak={currentStreak}
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
