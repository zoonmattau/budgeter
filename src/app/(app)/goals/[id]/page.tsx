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

  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!goal) {
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

  return (
    <div className="space-y-6">
      <GoalEditForm goal={goal} linkedAccount={linkedAccount} />
    </div>
  )
}
