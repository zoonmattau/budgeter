import { createClient } from '@/lib/supabase/server'
import { NewGoalForm } from '@/components/goals/new-goal-form'
import { calculateAvgMonthlyChange } from '@/lib/net-worth-calculations'

export default async function NewGoalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: accounts }, { data: snapshots }] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id),
    supabase
      .from('net_worth_snapshots')
      .select('snapshot_date, net_worth, total_assets, total_liabilities')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: true }),
  ])

  const debtAccounts = (accounts || []).filter(
    a => !a.is_asset && Number(a.balance) > 0
  ).sort((a, b) => Number(b.balance) - Number(a.balance))

  const totalAssets = accounts?.filter(a => a.is_asset).reduce((sum, a) => sum + Number(a.balance), 0) || 0
  const totalLiabilities = accounts?.filter(a => !a.is_asset).reduce((sum, a) => sum + Number(a.balance), 0) || 0
  const currentNetWorth = totalAssets - totalLiabilities

  const avgMonthlyGrowth = (snapshots && snapshots.length >= 2)
    ? calculateAvgMonthlyChange(snapshots, currentNetWorth)
    : 0

  return (
    <NewGoalForm
      debtAccounts={debtAccounts}
      currentNetWorth={currentNetWorth}
      avgMonthlyGrowth={avgMonthlyGrowth}
    />
  )
}
