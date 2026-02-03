import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BudgetOverview } from '@/components/dashboard/budget-overview'
import { BillsSummary } from '@/components/dashboard/bills-summary'
import { GoalsList } from '@/components/dashboard/goals-list'
import { UpcomingBills } from '@/components/dashboard/upcoming-bills'
import { DebtRepayments } from '@/components/dashboard/debt-repayments'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { QuickAddButton } from '@/components/transactions/quick-add-button'
import { InsightsTeaser } from '@/components/dashboard/quick-links'
import { NetWorthCard } from '@/components/dashboard/net-worth-card'
import { SmartPredictions } from '@/components/dashboard/smart-predictions'
import { CreditLimitWarning } from '@/components/dashboard/credit-limit-warning'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { CashflowPreview } from '@/components/dashboard/cashflow-preview'
import { ScopeToggle } from '@/components/ui/scope-toggle'
import { format, startOfMonth, addDays, subDays } from 'date-fns'
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

  // Fetch household members if in household view
  let members: HouseholdMember[] = []
  if (scope === 'household' && householdId) {
    const { data: householdMembers } = await supabase
      .from('household_members')
      .select(`
        user_id,
        role,
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
          .eq('month', currentMonth),

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
          .eq('month', currentMonth),

    // Transactions - scope aware with profile data for household view
    // Filter to current month but exclude future dates
    scope === 'household' && householdId
      ? supabase
          .from('transactions')
          .select('*, categories(*), profiles:user_id(display_name)')
          .eq('household_id', householdId)
          .gte('date', currentMonth)
          .lte('date', format(today, 'yyyy-MM-dd'))
          .order('date', { ascending: false })
      : supabase
          .from('transactions')
          .select('*, categories(*)')
          .eq('user_id', user.id)
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
          .eq('user_id', user.id),

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

    // Recurring income for cash flow (personal only)
    supabase
      .from('income_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_recurring', true),

    // All active bills for cash flow (personal only)
    supabase
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true),
  ])

  const totalIncome = incomeEntries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
  const totalAllocated = budgets?.reduce((sum, b) => sum + Number(b.allocated), 0) || 0
  const totalSpent = transactions
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
  const totalLiabilities = accounts?.filter(a => !a.is_asset).reduce((sum, a) => sum + Number(a.balance), 0) || 0
  const netWorth = totalAssets - totalLiabilities

  // Get credit cards for expense linking
  const creditCards = accounts?.filter(a => a.type === 'credit' || a.type === 'credit_card') || []

  // Get investment accounts for investment contributions
  const investmentAccounts = accounts?.filter(a => a.type === 'investment') || []

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
      const accountBalance = Number(linkedAccount.balance) || 0

      if (accountBalance <= 0 && goal.status !== 'completed') {
        const { error } = await supabase
          .from('goals')
          .update({
            status: 'completed',
            current_amount: targetAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', goal.id)
          .eq('status', 'active')

        if (error) console.error('Error completing goal:', error)
      } else if (accountBalance > 0) {
        const paidOff = Math.max(0, targetAmount - accountBalance)
        if (Math.abs(paidOff - currentAmount) > 0.01) {
          const { error } = await supabase
            .from('goals')
            .update({
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

  // Cast transactions for components
  const typedTransactions = (transactions || []) as (typeof transactions extends (infer T)[] | null ? T & { profiles?: { display_name: string | null } | null } : never)[]

  // Calculate daily spending stats for insights teaser
  const daysInMonth = new Date().getDate()
  const dailyAverage = daysInMonth > 0 ? totalSpent / daysInMonth : 0
  const dailyTarget = totalAllocated / 30

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
        scope={scope}
        memberBreakdown={memberBreakdown}
      />

      {/* Net Worth Card */}
      <NetWorthCard
        netWorth={netWorth}
        totalAssets={totalAssets}
        totalLiabilities={totalLiabilities}
      />

      {/* Cash Flow Preview */}
      <CashflowPreview
        accounts={accounts || []}
        incomeEntries={recurringIncome || []}
        bills={allBills || []}
      />

      {/* Credit Limit Warning */}
      <CreditLimitWarning creditCards={creditCards} />

      {/* Insights Teaser with Donut Chart */}
      <InsightsTeaser
        totalSpent={totalSpent}
        dailyAverage={dailyAverage}
        dailyTarget={dailyTarget}
        topCategory={topCategory}
        transactions={typedTransactions}
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

      {/* Goals Progress */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-gray-900">
            {scope === 'household' ? 'Household Goals' : 'Your Goals'}
          </h2>
          <Link href="/goals" className="text-sm text-bloom-600 hover:text-bloom-700 font-medium">
            See all
          </Link>
        </div>
        <GoalsList goals={goals || []} />
      </section>

      {/* Smart Predictions */}
      <SmartPredictions
        predictions={predictions || []}
        expenseCategories={expenseCategories || []}
      />

      {/* Bills & Subscriptions Summary */}
      <BillsSummary bills={bills || []} />

      {/* Upcoming Bills */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-gray-900">Upcoming Bills</h2>
          <Link href="/bills" className="text-sm text-bloom-600 hover:text-bloom-700 font-medium">
            See all
          </Link>
        </div>
        <UpcomingBills
          bills={bills || []}
          debtAccounts={accounts?.filter(a =>
            (a.type === 'credit' || a.type === 'credit_card' || a.type === 'loan' || a.type === 'debt') &&
            a.balance > 0 &&
            a.due_date &&
            a.minimum_payment
          ) || []}
        />
      </section>

      {/* Debt Repayments */}
      <DebtRepayments
        accounts={accounts || []}
        availableFunds={Math.max(0, totalIncome - totalAllocated)}
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
          showMemberBadge={scope === 'household'}
          members={members}
          currentUserId={user.id}
        />
      </section>

      {/* Quick Add FAB */}
      <QuickAddButton expenseCategories={expenseCategories || []} incomeCategories={incomeCategories || []} creditCards={creditCards} investmentAccounts={investmentAccounts} />
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
