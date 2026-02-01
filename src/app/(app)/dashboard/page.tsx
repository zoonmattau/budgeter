import { createClient } from '@/lib/supabase/server'
import { BudgetOverview } from '@/components/dashboard/budget-overview'
import { GoalsList } from '@/components/dashboard/goals-list'
import { UpcomingBills } from '@/components/dashboard/upcoming-bills'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { QuickAddButton } from '@/components/transactions/quick-add-button'
import { QuickLinks } from '@/components/dashboard/quick-links'
import { SpendingSnapshot } from '@/components/dashboard/spending-snapshot'
import { NetWorthCard } from '@/components/dashboard/net-worth-card'
import { format, startOfMonth } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  // Fetch dashboard data in parallel
  const [
    { data: incomeEntries },
    { data: budgets },
    { data: transactions },
    { data: goals },
    { data: bills },
    { data: expenseCategories },
    { data: incomeCategories },
    { data: accounts },
  ] = await Promise.all([
    supabase
      .from('income_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', currentMonth),
    supabase
      .from('budgets')
      .select('*, categories(*)')
      .eq('user_id', user.id)
      .eq('month', currentMonth),
    supabase
      .from('transactions')
      .select('*, categories(*)')
      .eq('user_id', user.id)
      .gte('date', currentMonth)
      .order('date', { ascending: false }),
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('bills')
      .select('*, categories(*)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('next_due', { ascending: true })
      .limit(4),
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
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id),
  ])

  const totalIncome = incomeEntries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
  const totalAllocated = budgets?.reduce((sum, b) => sum + Number(b.allocated), 0) || 0
  const totalSpent = transactions
    ?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0

  // Calculate net worth
  const totalAssets = accounts?.filter(a => a.is_asset).reduce((sum, a) => sum + Number(a.balance), 0) || 0
  const totalLiabilities = accounts?.filter(a => !a.is_asset).reduce((sum, a) => sum + Number(a.balance), 0) || 0
  const netWorth = totalAssets - totalLiabilities

  // Get credit cards for expense linking
  const creditCards = accounts?.filter(a => a.type === 'credit' || a.type === 'credit_card') || []

  // Create/update net worth snapshot if user has accounts
  if (accounts && accounts.length > 0) {
    const { error: snapshotError } = await supabase.rpc('create_net_worth_snapshot', { p_user_id: user.id })
    if (snapshotError) {
      console.error('Error creating net worth snapshot:', snapshotError)
    }
  }

  // Auto-complete debt payoff goals when linked account balance reaches 0
  // Use Promise.all for parallel updates and add error handling
  if (goals && accounts) {
    const debtPayoffGoals = goals.filter(g => g.goal_type === 'debt_payoff' && g.linked_account_id)
    const updates = debtPayoffGoals.map(async (goal) => {
      const linkedAccount = accounts.find(a => a.id === goal.linked_account_id)
      if (!linkedAccount) return

      const currentAmount = Number(goal.current_amount) || 0
      const targetAmount = Number(goal.target_amount) || 0
      const accountBalance = Number(linkedAccount.balance) || 0

      if (accountBalance <= 0 && goal.status !== 'completed') {
        // Auto-complete this goal
        const { error } = await supabase
          .from('goals')
          .update({
            status: 'completed',
            current_amount: targetAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', goal.id)
          .eq('status', 'active') // Only update if still active (prevents race condition)

        if (error) console.error('Error completing goal:', error)
      } else if (accountBalance > 0) {
        // Update current_amount to reflect how much has been paid off
        const paidOff = Math.max(0, targetAmount - accountBalance)
        // Only update if there's a meaningful difference (> $0.01)
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

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">
          {getGreeting()}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
      </div>

      {/* Budget Overview Card */}
      <BudgetOverview
        totalIncome={totalIncome}
        totalAllocated={totalAllocated}
        totalSpent={totalSpent}
      />

      {/* Net Worth Card */}
      <NetWorthCard
        netWorth={netWorth}
        totalAssets={totalAssets}
        totalLiabilities={totalLiabilities}
      />

      {/* Quick Links */}
      <QuickLinks />

      {/* Spending Snapshot */}
      <SpendingSnapshot transactions={transactions || []} />

      {/* Goals Progress */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-gray-900">Your Goals</h2>
          <a href="/goals" className="text-sm text-bloom-600 hover:text-bloom-700 font-medium">
            See all
          </a>
        </div>
        <GoalsList goals={goals || []} />
      </section>

      {/* Upcoming Bills */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-gray-900">Upcoming Bills</h2>
          <a href="/bills" className="text-sm text-bloom-600 hover:text-bloom-700 font-medium">
            See all
          </a>
        </div>
        <UpcomingBills bills={bills || []} />
      </section>

      {/* Recent Transactions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-gray-900">Recent Transactions</h2>
          <a href="/transactions" className="text-sm text-bloom-600 hover:text-bloom-700 font-medium">
            See all
          </a>
        </div>
        <RecentTransactions transactions={(transactions || []).slice(0, 5)} />
      </section>

      {/* Quick Add FAB */}
      <QuickAddButton expenseCategories={expenseCategories || []} incomeCategories={incomeCategories || []} creditCards={creditCards} />
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
