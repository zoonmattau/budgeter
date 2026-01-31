import { createClient } from '@/lib/supabase/server'
import { TransactionsList } from '@/components/transactions/transactions-list'
import { QuickAddButton } from '@/components/transactions/quick-add-button'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const currentMonth = startOfMonth(new Date())
  const monthEnd = endOfMonth(new Date())

  const [{ data: transactions }, { data: expenseCategories }, { data: incomeCategories }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, categories(*)')
      .eq('user_id', user.id)
      .gte('date', format(currentMonth, 'yyyy-MM-dd'))
      .lte('date', format(monthEnd, 'yyyy-MM-dd'))
      .order('date', { ascending: false }),
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'expense'),
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'income'),
  ])

  const totalExpenses = transactions
    ?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0

  const totalIncome = transactions
    ?.filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'MMMM yyyy')}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-sm text-gray-500">Income</p>
          <p className="text-xl font-bold text-sprout-600">
            +${totalIncome.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Expenses</p>
          <p className="text-xl font-bold text-gray-900">
            -${totalExpenses.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Transactions List */}
      <TransactionsList transactions={transactions || []} />

      <QuickAddButton expenseCategories={expenseCategories || []} incomeCategories={incomeCategories || []} />
    </div>
  )
}
