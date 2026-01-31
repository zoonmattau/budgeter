import { createClient } from '@/lib/supabase/server'
import { format, subDays, startOfMonth } from 'date-fns'
import { InsightsClient } from '@/components/charts/insights-client'

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd')

  // Fetch all data needed for charts
  const [
    { data: transactions },
    { data: budgets },
    { data: incomeEntries },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, categories(*)')
      .eq('user_id', user.id)
      .gte('date', ninetyDaysAgo)
      .order('date', { ascending: true }),
    supabase
      .from('budgets')
      .select('*, categories(*)')
      .eq('user_id', user.id)
      .eq('month', currentMonth),
    supabase
      .from('income_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', currentMonth),
  ])

  const totalIncome = incomeEntries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
  const totalBudgeted = budgets?.reduce((sum, b) => sum + Number(b.allocated), 0) || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Insights</h1>
        <p className="text-gray-500 text-sm mt-1">Understand your spending patterns</p>
      </div>

      <InsightsClient
        transactions={transactions || []}
        budgets={budgets || []}
        totalIncome={totalIncome}
        totalBudgeted={totalBudgeted}
      />
    </div>
  )
}
