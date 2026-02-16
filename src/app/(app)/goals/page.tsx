import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { GoalCard } from '@/components/goals/goal-card'
import { calculateMilestoneInfo } from '@/lib/net-worth-calculations'
import type { MilestoneInfo } from '@/lib/net-worth-calculations'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const currentMonth = new Date().toISOString().slice(0, 7) + '-01'

  const [{ data: goals }, { data: accounts }, { data: incomeEntries }, { data: budgets }, { data: bills }] = await Promise.all([
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('status', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase
      .from('accounts')
      .select('id, balance, is_asset')
      .eq('user_id', user.id),
    supabase
      .from('income_entries')
      .select('amount')
      .eq('user_id', user.id)
      .is('household_id', null)
      .eq('month', currentMonth),
    supabase
      .from('budgets')
      .select('allocated')
      .eq('user_id', user.id)
      .is('household_id', null)
      .eq('month', currentMonth),
    supabase
      .from('bills')
      .select('amount, frequency, is_active, is_one_off')
      .eq('user_id', user.id)
      .is('household_id', null),
  ])

  // Compute net worth
  const totalAssets = accounts?.filter(a => a.is_asset).reduce((sum, a) => sum + Number(a.balance), 0) || 0
  const totalLiabilities = accounts?.filter(a => !a.is_asset).reduce((sum, a) => sum + Math.abs(Number(a.balance) || 0), 0) || 0
  const netWorth = totalAssets - totalLiabilities

  // Compute growth from budget data
  const totalIncome = incomeEntries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
  const categoryAllocated = (budgets || []).reduce((sum, b) => sum + Number(b.allocated), 0)
  const monthlySinkingFunds = (bills || [])
    .filter(b => b.is_active && !b.is_one_off && (b.frequency === 'quarterly' || b.frequency === 'yearly'))
    .reduce((sum, b) => sum + Number(b.amount) / (b.frequency === 'yearly' ? 12 : 3), 0)
  const avgMonthlyGrowth = Math.max(0, totalIncome - categoryAllocated - monthlySinkingFunds)

  // Build milestone info map for net_worth_milestone goals
  const milestoneInfoMap: Record<string, MilestoneInfo> = {}
  for (const goal of (goals || [])) {
    if (goal.goal_type === 'net_worth_milestone') {
      milestoneInfoMap[goal.id] = calculateMilestoneInfo(
        netWorth,
        Number(goal.target_amount),
        avgMonthlyGrowth,
        goal.deadline,
      )
    }
  }

  const activeGoals = goals?.filter(g => g.status === 'active') || []
  const completedGoals = goals?.filter(g => g.status === 'completed') || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Goals</h1>
          <p className="text-gray-500 text-sm mt-1">
            {activeGoals.length} active goal{activeGoals.length !== 1 && 's'}
          </p>
        </div>
        <Link href="/goals/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Goal
        </Link>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 ? (
        <div className="grid gap-4">
          {activeGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} milestoneInfo={milestoneInfoMap[goal.id]} />
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="w-20 h-20 rounded-full bg-bloom-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-bloom-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h3 className="font-display text-lg font-semibold text-gray-900 mb-1">No goals yet</h3>
          <p className="text-gray-500 text-sm mb-6">Set your first savings goal and watch it bloom!</p>
          <Link href="/goals/new" className="btn-primary inline-flex">
            <Plus className="w-4 h-4" />
            Create Your First Goal
          </Link>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="font-display font-semibold text-gray-900 mb-3">Completed</h2>
          <div className="grid gap-3">
            {completedGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} milestoneInfo={milestoneInfoMap[goal.id]} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
