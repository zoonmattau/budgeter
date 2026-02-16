import { createClient } from '@/lib/supabase/server'
import { NewGoalForm } from '@/components/goals/new-goal-form'

export default async function NewGoalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const currentMonth = new Date().toISOString().slice(0, 7) + '-01'

  const [
    { data: accounts },
    { data: incomeEntries },
    { data: budgets },
    { data: bills },
    { data: budgetSettings },
  ] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id),
    supabase
      .from('income_entries')
      .select('*')
      .eq('user_id', user.id)
      .is('household_id', null)
      .eq('month', currentMonth),
    supabase
      .from('budgets')
      .select('*, categories(name)')
      .eq('user_id', user.id)
      .is('household_id', null)
      .eq('month', currentMonth),
    supabase
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .is('household_id', null),
    supabase
      .from('budget_settings')
      .select('*')
      .eq('user_id', user.id)
      .is('household_id', null)
      .eq('month', currentMonth)
      .maybeSingle(),
  ])

  const debtAccounts = (accounts || []).filter(
    a => !a.is_asset && Math.abs(Number(a.balance) || 0) > 0
  ).sort((a, b) => Math.abs(Number(b.balance) || 0) - Math.abs(Number(a.balance) || 0))

  const totalAssets = accounts?.filter(a => a.is_asset).reduce((sum, a) => sum + Number(a.balance), 0) || 0
  const totalLiabilities = accounts?.filter(a => !a.is_asset).reduce((sum, a) => sum + Number(a.balance), 0) || 0
  const currentNetWorth = totalAssets - totalLiabilities

  // Calculate expected monthly net worth growth from budget data
  const totalIncome = incomeEntries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0

  // Category spending = money that leaves (net worth neutral: earned then spent)
  const categoryAllocated = (budgets || []).reduce((sum, b) => sum + Number(b.allocated), 0)

  // Sinking funds = money set aside for quarterly/yearly bills (also spent, not growing net worth)
  const monthlySinkingFunds = (bills || [])
    .filter(b => b.is_active && !b.is_one_off && (b.frequency === 'quarterly' || b.frequency === 'yearly'))
    .reduce((sum, b) => sum + Number(b.amount) / (b.frequency === 'yearly' ? 12 : 3), 0)

  // Net worth growth = income minus spending commitments
  // Debt payments and unallocated funds both improve net worth
  const avgMonthlyGrowth = Math.max(0, totalIncome - categoryAllocated - monthlySinkingFunds)

  return (
    <NewGoalForm
      debtAccounts={debtAccounts}
      currentNetWorth={currentNetWorth}
      avgMonthlyGrowth={avgMonthlyGrowth}
    />
  )
}
