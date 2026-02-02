import { createClient } from '@/lib/supabase/server'
import { BudgetBuilder } from '@/components/budget/budget-builder'
import { ScopeToggle } from '@/components/ui/scope-toggle'
import { format, startOfMonth } from 'date-fns'
import type { ViewScope, HouseholdMember } from '@/lib/scope-context'

interface BudgetPageProps {
  searchParams: Promise<{ scope?: string }>
}

export default async function BudgetPage({ searchParams }: BudgetPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const params = await searchParams
  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  // Fetch household membership with contribution info
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

  // User's own contribution to the household
  const userContribution = membership?.contribution_amount ? Number(membership.contribution_amount) : 0
  const userContributionFrequency = membership?.contribution_frequency || 'monthly'

  // Fetch household members with contributions if in household
  interface MemberWithContribution extends HouseholdMember {
    contribution_amount: number
    contribution_frequency: string
  }
  let members: HouseholdMember[] = []
  let memberContributions: MemberWithContribution[] = []

  if (householdId) {
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

    const processedMembers = (householdMembers || []).map((m) => {
      const profile = m.profiles as unknown as { display_name: string | null } | null
      return {
        user_id: m.user_id,
        display_name: profile?.display_name || null,
        role: m.role as 'owner' | 'member',
        contribution_amount: Number(m.contribution_amount) || 0,
        contribution_frequency: m.contribution_frequency || 'monthly',
      }
    })

    members = processedMembers
    memberContributions = processedMembers
  }

  // Fetch budget data - scope-aware
  const [
    { data: categories },
    { data: budgets },
    { data: incomeEntries },
    { data: transactions },
  ] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .order('sort_order'),
    scope === 'household' && householdId
      ? supabase
          .from('budgets')
          .select('*')
          .eq('household_id', householdId)
          .eq('month', currentMonth)
      : supabase
          .from('budgets')
          .select('*')
          .eq('user_id', user.id)
          .eq('month', currentMonth),
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
    scope === 'household' && householdId
      ? supabase
          .from('transactions')
          .select('*')
          .eq('household_id', householdId)
          .eq('type', 'expense')
          .gte('date', currentMonth)
      : supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'expense')
          .gte('date', currentMonth),
  ])

  // Calculate spent per category
  const spentByCategory = (transactions || []).reduce((acc, t) => {
    acc[t.category_id] = (acc[t.category_id] || 0) + Number(t.amount)
    return acc
  }, {} as Record<string, number>)

  // Calculate spending by member per category for household view
  const spentByMemberByCategory: Record<string, Record<string, number>> = {}
  if (scope === 'household' && transactions) {
    transactions.forEach(t => {
      if (!spentByMemberByCategory[t.category_id]) {
        spentByMemberByCategory[t.category_id] = {}
      }
      const current = spentByMemberByCategory[t.category_id][t.user_id] || 0
      spentByMemberByCategory[t.category_id][t.user_id] = current + Number(t.amount)
    })
  }

  // Calculate total household contributions (normalized to monthly)
  const frequencyMultiplier: Record<string, number> = {
    weekly: 4.33,
    fortnightly: 2.17,
    monthly: 1,
  }

  const totalHouseholdContributions = memberContributions.reduce((sum, m) => {
    const multiplier = frequencyMultiplier[m.contribution_frequency] || 1
    return sum + (m.contribution_amount * multiplier)
  }, 0)

  // Calculate user's monthly contribution for personal budget
  const userMonthlyContribution = userContribution * (frequencyMultiplier[userContributionFrequency] || 1)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            {scope === 'household' ? 'Household Budget' : 'Budget'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'MMMM yyyy')}</p>
        </div>
        {isInHousehold && <ScopeToggle />}
      </div>

      <BudgetBuilder
        categories={categories || []}
        budgets={budgets || []}
        incomeEntries={incomeEntries || []}
        spentByCategory={spentByCategory}
        spentByMemberByCategory={spentByMemberByCategory}
        currentMonth={currentMonth}
        scope={scope}
        householdId={householdId}
        members={members}
        currentUserId={user.id}
        householdContributions={totalHouseholdContributions}
        memberContributions={memberContributions}
        userMonthlyContribution={userMonthlyContribution}
      />
    </div>
  )
}
