import { createClient } from '@/lib/supabase/server'
import { BudgetBuilder } from '@/components/budget/budget-builder'
import { format, startOfMonth } from 'date-fns'

export default async function BudgetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')

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
    supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', currentMonth),
    supabase
      .from('income_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', currentMonth),
    supabase
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

  const totalIncome = incomeEntries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Budget</h1>
        <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'MMMM yyyy')}</p>
      </div>

      <BudgetBuilder
        categories={categories || []}
        budgets={budgets || []}
        incomeEntries={incomeEntries || []}
        spentByCategory={spentByCategory}
        currentMonth={currentMonth}
      />
    </div>
  )
}
