import { createClient } from '@/lib/supabase/server'
import { MoneyBucketsOverview } from '@/components/buckets/money-buckets-overview'
import { BucketSection } from '@/components/buckets/bucket-section'
import { format, startOfMonth } from 'date-fns'

export default async function BucketsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  // Fetch all bucket data in parallel
  const [
    { data: budgets },
    { data: goals },
    { data: accounts },
    { data: transactions },
  ] = await Promise.all([
    supabase
      .from('budgets')
      .select('*, categories(*)')
      .eq('user_id', user.id)
      .eq('month', currentMonth),
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('type', { ascending: true }),
    supabase
      .from('transactions')
      .select('*, categories(*)')
      .eq('user_id', user.id)
      .gte('date', currentMonth)
      .eq('type', 'expense'),
  ])

  // Calculate spent per budget category
  const spentByCategory = (transactions || []).reduce((acc, t) => {
    acc[t.category_id] = (acc[t.category_id] || 0) + Number(t.amount)
    return acc
  }, {} as Record<string, number>)

  // Format budget buckets
  const budgetBuckets = (budgets || []).map((b) => ({
    id: b.id,
    name: b.categories?.name || 'Unknown',
    allocated: Number(b.allocated),
    spent: spentByCategory[b.category_id] || 0,
    remaining: Number(b.allocated) - (spentByCategory[b.category_id] || 0),
    color: b.categories?.color || '#d946ef',
    icon: b.categories?.icon || 'circle',
  }))

  // Format savings buckets (goals)
  const savingsBuckets = (goals || []).map((g) => ({
    id: g.id,
    name: g.name,
    current: Number(g.current_amount),
    target: Number(g.target_amount),
    progress: Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100),
    color: g.color,
    icon: g.icon,
  }))

  // Format account buckets
  const accountBuckets = (accounts || []).map((a) => ({
    id: a.id,
    name: a.name,
    balance: Number(a.balance),
    type: a.type,
    institution: a.institution,
    isAsset: a.is_asset,
  }))

  // Calculate totals
  const totalBudgetAllocated = budgetBuckets.reduce((sum, b) => sum + b.allocated, 0)
  const totalBudgetRemaining = budgetBuckets.reduce((sum, b) => sum + b.remaining, 0)
  const totalSavings = savingsBuckets.reduce((sum, b) => sum + b.current, 0)
  const totalInAccounts = accountBuckets
    .filter((a) => a.isAsset)
    .reduce((sum, a) => sum + a.balance, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Money Buckets</h1>
        <p className="text-gray-500 text-sm mt-1">Where your money is allocated</p>
      </div>

      {/* Overview */}
      <MoneyBucketsOverview
        budgetAllocated={totalBudgetAllocated}
        budgetRemaining={totalBudgetRemaining}
        savingsTotal={totalSavings}
        accountsTotal={totalInAccounts}
      />

      {/* Budget Buckets */}
      <BucketSection
        title="Budget Buckets"
        subtitle="Monthly spending allocations"
        type="budget"
        buckets={budgetBuckets}
        emptyMessage="No budgets set up yet"
      />

      {/* Savings Buckets */}
      <BucketSection
        title="Savings Buckets"
        subtitle="Goals you're saving towards"
        type="savings"
        buckets={savingsBuckets}
        emptyMessage="No savings goals yet"
      />

      {/* Account Buckets */}
      <BucketSection
        title="Account Buckets"
        subtitle="Where your money sits"
        type="accounts"
        buckets={accountBuckets}
        emptyMessage="No accounts added yet"
      />
    </div>
  )
}
