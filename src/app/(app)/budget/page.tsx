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
    { data: householdContributionEntries },
    { data: userContributionCommit },
    { data: transactions },
    { data: bills },
    { data: debtAccounts },
    { data: savingsGoals },
    { data: budgetSettings },
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
          .select('*, categories(name)')
          .eq('household_id', householdId)
          .eq('month', currentMonth)
      : supabase
          .from('budgets')
          .select('*')
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .is('household_id', null),
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
    householdId
      ? supabase
          .from('income_entries')
          .select('id, user_id, amount, source, month, household_id')
          .eq('household_id', householdId)
          .eq('month', currentMonth)
          .like('source', 'Contribution:%')
      : Promise.resolve({ data: [] as { id: string; user_id: string; amount: number; source: string; month: string; household_id: string | null }[] }),
    householdId
      ? supabase
          .from('income_entries')
          .select('id, amount')
          .eq('household_id', householdId)
          .eq('month', currentMonth)
          .eq('source', `Contribution:${user.id}`)
          .maybeSingle()
      : Promise.resolve({ data: null as { id: string; amount: number } | null }),
    scope === 'household' && householdId
      ? supabase
          .from('transactions')
          .select('*')
          .eq('household_id', householdId)
          .eq('type', 'expense')
          .gte('date', currentMonth)
          .lte('date', format(new Date(), 'yyyy-MM-dd'))
      : supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'expense')
          .gte('date', currentMonth)
          .lte('date', format(new Date(), 'yyyy-MM-dd'))
          .is('household_id', null),
    scope === 'household' && householdId
      ? supabase
          .from('bills')
          .select('id, name, amount, frequency, next_due, category_id, is_active, is_one_off, saved_amount')
          .eq('household_id', householdId)
          .eq('is_active', true)
          .order('next_due')
      : supabase
          .from('bills')
          .select('id, name, amount, frequency, next_due, category_id, is_active, is_one_off, saved_amount')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .is('household_id', null)
          .order('next_due'),
    scope === 'household' && householdId
      ? supabase
          .from('accounts')
          .select('id, name, type, balance, minimum_payment, payment_frequency')
          .eq('household_id', householdId)
          .in('type', ['credit', 'credit_card', 'debt', 'loan'])
          .gt('balance', 0)
      : supabase
          .from('accounts')
          .select('id, name, type, balance, minimum_payment, payment_frequency')
          .eq('user_id', user.id)
          .in('type', ['credit', 'credit_card', 'debt', 'loan'])
          .is('household_id', null)
          .gt('balance', 0),
    // Savings goals (non-debt payoff goals)
    supabase
      .from('goals')
      .select('id, name, target_amount, current_amount, target_date, icon, color, goal_type')
      .eq('user_id', user.id)
      .is('household_id', null)
      .eq('status', 'active')
      .eq('goal_type', 'savings')
      .order('created_at'),
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
  ])

  // For household budgets: deduplicate by category NAME (not ID) since each member
  // has their own categories with different IDs, then remap to current user's category IDs.
  const deduplicatedBudgets = scope === 'household'
    ? (() => {
        // Map current user's category name → ID
        const userCatByName: Record<string, string> = {}
        for (const c of categories || []) {
          userCatByName[c.name.toLowerCase()] = c.id
        }
        // Deduplicate by category name, keep most recent
        const byName: Record<string, NonNullable<typeof budgets>[0]> = {}
        for (const b of budgets || []) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const catName = (b as any).categories?.name?.toLowerCase() as string | undefined
          if (!catName) continue
          if (!byName[catName] || b.updated_at > byName[catName].updated_at) {
            byName[catName] = b
          }
        }
        // Remap to current user's category IDs
        return Object.entries(byName)
          .filter(([name]) => userCatByName[name])
          .map(([name, b]) => {
            const userCatId = userCatByName[name]
            return userCatId !== b.category_id
              ? Object.assign({}, b, { category_id: userCatId })
              : b
          })
      })()
    : budgets || []

  // Filter out Interest and Other categories, then sort by user-defined order
  const sortedCategories = [...(categories || [])]
    .filter(c => {
      const name = c.name.toLowerCase()
      return name !== 'interest' && name !== 'other' && name !== 'interest & other'
    })
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  // Calculate spent per category
  const spentByCategory = (transactions || []).reduce((acc, t) => {
    acc[t.category_id] = (acc[t.category_id] || 0) + Number(t.amount)
    return acc
  }, {} as Record<string, number>)

  // Group transactions by category (most recent first, limit 5 per category)
  const transactionsByCategory = (transactions || [])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .reduce((acc, t) => {
      if (!acc[t.category_id]) acc[t.category_id] = []
      if (acc[t.category_id].length < 5) {
        acc[t.category_id].push(t)
      }
      return acc
    }, {} as Record<string, typeof transactions>)

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
    quarterly: 1 / 3,
    yearly: 1 / 12,
  }

  const totalHouseholdContributions = memberContributions.reduce((sum, m) => {
    const multiplier = frequencyMultiplier[m.contribution_frequency] || 1
    return sum + (m.contribution_amount * multiplier)
  }, 0)

  // Calculate user's monthly contribution for personal budget
  const userMonthlyContribution = userContribution * (frequencyMultiplier[userContributionFrequency] || 1)
  const committedMonthlyContribution = Number(userContributionCommit?.amount) || 0
  const committedHouseholdContributions = (householdContributionEntries || [])
    .reduce((sum, entry) => sum + Number(entry.amount), 0)
  const effectiveHouseholdContributions = householdId
    ? committedHouseholdContributions
    : totalHouseholdContributions
  const effectiveHouseholdIncome = scope === 'household'
    ? (incomeEntries || []).reduce((sum, entry) => sum + Number(entry.amount), 0)
    : effectiveHouseholdContributions

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
        key={scope} // Force remount when scope changes to reset allocations state
        categories={sortedCategories}
        budgets={deduplicatedBudgets}
        incomeEntries={incomeEntries || []}
        spentByCategory={spentByCategory}
        spentByMemberByCategory={spentByMemberByCategory}
        currentMonth={currentMonth}
        scope={scope}
        householdId={householdId}
        members={members}
        currentUserId={user.id}
        householdContributions={effectiveHouseholdIncome}
        memberContributions={memberContributions}
        userMonthlyContribution={userMonthlyContribution}
        committedMonthlyContribution={committedMonthlyContribution}
        bills={bills || []}
        transactionsByCategory={transactionsByCategory}
        debtAccounts={debtAccounts || []}
        userContribution={userContribution}
        userContributionFrequency={userContributionFrequency}
        savingsGoals={savingsGoals || []}
        savedExtraDebtPayment={Number(budgetSettings?.extra_debt_payment) || 0}
      />
    </div>
  )
}
