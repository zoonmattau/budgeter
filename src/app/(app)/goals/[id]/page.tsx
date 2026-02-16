import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GoalEditForm } from '@/components/goals/goal-edit-form'
import { calculateMilestoneInfo } from '@/lib/net-worth-calculations'
import type { MilestoneInfo } from '@/lib/net-worth-calculations'

interface GoalPageProps {
  params: Promise<{ id: string }>
}

export default async function GoalPage({ params }: GoalPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch goal - also allow household goals
  const { data: goalData } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .single()

  if (!goalData) {
    notFound()
  }
  let goal = goalData

  // Check access: user owns goal OR goal is in user's household
  const isOwner = goal.user_id === user.id
  let isHouseholdMember = false

  if (goal.household_id) {
    const { data: membership } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', goal.household_id)
      .eq('user_id', user.id)
      .single()
    isHouseholdMember = !!membership
  }

  if (!isOwner && !isHouseholdMember) {
    notFound()
  }

  // Fetch linked account if it's a debt payoff goal
  let linkedAccount = null
  if (goal.linked_account_id) {
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', goal.linked_account_id)
      .single()
    linkedAccount = data
  }

  // Fetch contributions with user info for household goals
  let contributions: { user_id: string; total: number; display_name: string | null }[] = []
  if (goal.household_id) {
    const { data: contribs } = await supabase
      .from('goal_contributions')
      .select('user_id, amount')
      .eq('goal_id', goal.id)

    if (contribs && contribs.length > 0) {
      // Aggregate by user
      const byUser = contribs.reduce((acc, c) => {
        acc[c.user_id] = (acc[c.user_id] || 0) + Number(c.amount)
        return acc
      }, {} as Record<string, number>)

      // Fetch display names
      const userIds = Object.keys(byUser)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds)

      const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || [])

      contributions = userIds.map(uid => ({
        user_id: uid,
        total: byUser[uid],
        display_name: profileMap.get(uid) || null
      }))
    }
  }

  // Compute milestone info for net_worth_milestone goals
  let milestoneInfo: MilestoneInfo | undefined
  if (goal.goal_type === 'net_worth_milestone') {
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'

    const [{ data: accounts }, { data: incomeEntries }, { data: milestoneBudgets }, { data: milestoneBills }] = await Promise.all([
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

    const totalAssets = accounts?.filter(a => a.is_asset).reduce((sum, a) => sum + Number(a.balance), 0) || 0
    const totalLiabilities = accounts?.filter(a => !a.is_asset).reduce((sum, a) => sum + Math.abs(Number(a.balance) || 0), 0) || 0
    const netWorth = totalAssets - totalLiabilities

    const totalIncome = incomeEntries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
    const categoryAllocated = (milestoneBudgets || []).reduce((sum, b) => sum + Number(b.allocated), 0)
    const monthlySinkingFunds = (milestoneBills || [])
      .filter(b => b.is_active && !b.is_one_off && (b.frequency === 'quarterly' || b.frequency === 'yearly'))
      .reduce((sum, b) => sum + Number(b.amount) / (b.frequency === 'yearly' ? 12 : 3), 0)
    const avgMonthlyGrowth = Math.max(0, totalIncome - categoryAllocated - monthlySinkingFunds)

    const targetAmount = Number(goal.target_amount) || 0
    const shouldBeCompleted = netWorth >= targetAmount
    const desiredStatus = shouldBeCompleted ? 'completed' : 'active'
    const desiredCurrentAmount = shouldBeCompleted ? targetAmount : netWorth

    if (goal.status !== desiredStatus || Math.abs(Number(goal.current_amount) - desiredCurrentAmount) > 0.01) {
      await supabase
        .from('goals')
        .update({
          status: desiredStatus,
          current_amount: desiredCurrentAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goal.id)

      goal = {
        ...goal,
        status: desiredStatus,
        current_amount: desiredCurrentAmount,
      }
    }

    milestoneInfo = calculateMilestoneInfo(
      netWorth,
      targetAmount,
      avgMonthlyGrowth,
      goal.deadline,
      Number(goal.starting_amount),
      goal.created_at,
    )
  }

  return (
    <div className="space-y-6">
      <GoalEditForm
        goal={goal}
        linkedAccount={linkedAccount}
        isHouseholdGoal={!!goal.household_id}
        contributions={contributions}
        currentUserId={user.id}
        milestoneInfo={milestoneInfo}
      />
    </div>
  )
}
