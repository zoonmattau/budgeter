import { createClient } from '@/lib/supabase/server'
import { BudgetOverview } from '@/components/dashboard/budget-overview'
import { GoalsList } from '@/components/dashboard/goals-list'
import { UpcomingBills } from '@/components/dashboard/upcoming-bills'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { QuickAddButton } from '@/components/transactions/quick-add-button'
import { ActiveChallenge } from '@/components/dashboard/active-challenge'
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
    { data: challenges },
    { data: categories },
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
      .order('date', { ascending: false })
      .limit(5),
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
      .from('challenges')
      .select('*, goals(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single(),
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'expense'),
  ])

  const totalIncome = incomeEntries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
  const totalAllocated = budgets?.reduce((sum, b) => sum + Number(b.allocated), 0) || 0
  const totalSpent = transactions
    ?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0

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

      {/* Active Challenge */}
      {challenges && (
        <ActiveChallenge challenge={challenges} />
      )}

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
        <RecentTransactions transactions={transactions || []} />
      </section>

      {/* Quick Add FAB */}
      <QuickAddButton categories={categories || []} />
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
