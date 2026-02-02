import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TransactionsList } from '@/components/transactions/transactions-list'
import { QuickAddButton } from '@/components/transactions/quick-add-button'
import { ScopeToggle } from '@/components/ui/scope-toggle'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import type { ViewScope, HouseholdMember } from '@/lib/scope-context'
import type { MemberSpending } from '@/components/ui/member-breakdown'

interface TransactionsPageProps {
  searchParams: Promise<{ scope?: string }>
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const params = await searchParams
  const currentMonth = startOfMonth(new Date())
  const monthEnd = endOfMonth(new Date())

  // Fetch household membership
  const { data: membership } = await supabase
    .from('household_members')
    .select(`
      household_id,
      role,
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

  // Fetch household members if in household view
  let members: HouseholdMember[] = []
  if (scope === 'household' && householdId) {
    const { data: householdMembers } = await supabase
      .from('household_members')
      .select(`
        user_id,
        role,
        profiles (
          display_name
        )
      `)
      .eq('household_id', householdId)

    members = (householdMembers || []).map((m) => {
      const profile = m.profiles as unknown as { display_name: string | null } | null
      return {
        user_id: m.user_id,
        display_name: profile?.display_name || null,
        role: m.role as 'owner' | 'member',
      }
    })
  }

  // Fetch transactions - scope-aware
  const [{ data: transactions }, { data: expenseCategories }, { data: incomeCategories }, { data: accounts }] = await Promise.all([
    scope === 'household' && householdId
      ? supabase
          .from('transactions')
          .select('*, categories(*), profiles:user_id(display_name)')
          .eq('household_id', householdId)
          .gte('date', format(currentMonth, 'yyyy-MM-dd'))
          .lte('date', format(monthEnd, 'yyyy-MM-dd'))
          .order('date', { ascending: false })
      : supabase
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
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .in('type', ['credit', 'credit_card']),
  ])

  const totalExpenses = transactions
    ?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0

  const totalIncome = transactions
    ?.filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0

  // Calculate member breakdown for household view
  let memberBreakdown: MemberSpending[] = []
  if (scope === 'household' && members.length > 0 && transactions) {
    const spendingByUser = new Map<string, number>()
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const current = spendingByUser.get(t.user_id) || 0
        spendingByUser.set(t.user_id, current + Number(t.amount))
      })

    memberBreakdown = members.map(member => ({
      userId: member.user_id,
      displayName: member.user_id === user.id ? 'You' : member.display_name,
      amount: spendingByUser.get(member.user_id) || 0,
    }))
  }

  // Cast transactions for component
  const typedTransactions = (transactions || []) as (typeof transactions extends (infer T)[] | null ? T & { profiles?: { display_name: string | null } | null } : never)[]

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">
              {scope === 'household' ? 'Household Transactions' : 'Transactions'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'MMMM yyyy')}</p>
          </div>
          <Link
            href="/import"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors flex-shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Smart Import</span>
            <span className="sm:hidden">Import</span>
          </Link>
        </div>
        {isInHousehold && <ScopeToggle />}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-sm text-gray-500">
            {scope === 'household' ? 'Household Income' : 'Income'}
          </p>
          <p className="text-xl font-bold text-sprout-600">
            +${totalIncome.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">
            {scope === 'household' ? 'Household Expenses' : 'Expenses'}
          </p>
          <p className="text-xl font-bold text-gray-900">
            -${totalExpenses.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Transactions List */}
      <TransactionsList
        transactions={typedTransactions}
        categories={[...(expenseCategories || []), ...(incomeCategories || [])]}
        showMemberBadge={scope === 'household'}
        members={members}
        currentUserId={user.id}
        memberBreakdown={memberBreakdown}
      />

      <QuickAddButton expenseCategories={expenseCategories || []} incomeCategories={incomeCategories || []} creditCards={accounts || []} />
    </div>
  )
}
