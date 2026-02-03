import { createClient } from '@/lib/supabase/server'
import { CashflowClient } from './cashflow-client'
import { SetupPrompt } from '@/components/cashflow/setup-prompt'

export default async function CashflowPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch all required data in parallel
  const [accountsRes, incomeRes, billsRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .in('type', ['bank', 'cash', 'credit', 'credit_card']),
    supabase
      .from('income_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_recurring', true),
    supabase
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true),
  ])

  const accounts = accountsRes.data || []
  const incomeEntries = incomeRes.data || []
  const bills = billsRes.data || []

  // Check if any income has pay schedule configured
  const hasPaySchedule = incomeEntries.some(
    (income) => income.pay_frequency && income.pay_day !== null
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Cash Flow</h1>
        <p className="text-gray-500 text-sm mt-1">
          Projected balance over the coming weeks
        </p>
      </div>

      {!hasPaySchedule ? (
        <SetupPrompt />
      ) : (
        <CashflowClient
          accounts={accounts}
          incomeEntries={incomeEntries}
          bills={bills}
        />
      )}
    </div>
  )
}
