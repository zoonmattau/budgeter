import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GoalEditForm } from '@/components/goals/goal-edit-form'

interface GoalPageProps {
  params: Promise<{ id: string }>
}

export default async function GoalPage({ params }: GoalPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch goal - also allow household goals
  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .single()

  if (!goal) {
    notFound()
  }

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

  return (
    <div className="space-y-6">
      <GoalEditForm
        goal={goal}
        linkedAccount={linkedAccount}
        isHouseholdGoal={!!goal.household_id}
        contributions={contributions}
        currentUserId={user.id}
      />
    </div>
  )
}
