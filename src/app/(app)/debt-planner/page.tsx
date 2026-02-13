import Link from 'next/link'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { format, startOfMonth } from 'date-fns'
import { DebtPlannerClient } from './client'
import type { Debt } from '@/lib/debt-calculator'

export default async function DebtPlannerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  // Fetch all data in parallel
  const [
    { data: accounts },
    { data: incomeEntries },
    { data: bills },
    { data: budgets },
    { data: goals },
  ] = await Promise.all([
    // Fetch debt accounts (credit cards and loans)
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .in('type', ['credit', 'credit_card', 'loan', 'debt'])
      .gt('balance', 0),
    // Fetch income entries for current month
    supabase
      .from('income_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', currentMonth),
    // Fetch active recurring bills only (exclude one-off)
    supabase
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .or('is_one_off.is.null,is_one_off.eq.false'),
    // Fetch budget allocations for current month with categories
    supabase
      .from('budgets')
      .select('*, categories(*)')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .is('household_id', null),
    // Fetch active savings goals
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('goal_type', 'savings'),
  ])

  // Transform accounts to Debt type with original amount for progress tracking
  const debts: Debt[] = (accounts || []).map(account => ({
    id: account.id,
    name: account.name,
    balance: account.balance,
    interestRate: account.interest_rate || 0,
    minimumPayment: account.minimum_payment || 0,
    institution: account.institution,
    type: account.type,
    originalAmount: account.original_amount || account.balance,
  }))

  // Calculate total debt paid off (original - current balance)
  const totalOriginalDebt = debts.reduce((sum, d) => sum + (d.originalAmount || d.balance), 0)
  const totalCurrentDebt = debts.reduce((sum, d) => sum + d.balance, 0)
  const totalPaidOff = Math.max(0, totalOriginalDebt - totalCurrentDebt)
  const progressPercent = totalOriginalDebt > 0 ? (totalPaidOff / totalOriginalDebt) * 100 : 0

  // Calculate monthly income from income entries (already monthly amounts)
  const monthlyIncome = (incomeEntries || []).reduce((total, entry) => {
    return total + Number(entry.amount)
  }, 0)

  // Exclude rent/mortgage from bills since they're already shown via budget categories
  const rentKeywords = ['rent', 'mortgage', 'housing', 'home loan']
  const nonRentBills = (bills || []).filter(bill =>
    !rentKeywords.some(k => bill.name.toLowerCase().includes(k))
  )

  // Calculate monthly bills (only recurring, excluding rent/mortgage)
  const monthlyBills = nonRentBills.reduce((total, bill) => {
    let monthlyAmount = Number(bill.amount)
    switch (bill.frequency) {
      case 'weekly':
        monthlyAmount = bill.amount * 52 / 12
        break
      case 'fortnightly':
        monthlyAmount = bill.amount * 26 / 12
        break
      case 'quarterly':
        monthlyAmount = bill.amount / 3
        break
      case 'yearly':
        monthlyAmount = bill.amount / 12
        break
      default: // monthly
        monthlyAmount = Number(bill.amount)
    }
    return total + monthlyAmount
  }, 0)

  // Calculate budget allocations (other expenses user has budgeted for)
  const budgetAllocations = (budgets || []).reduce((total, budget) => {
    return total + Number(budget.allocated)
  }, 0)

  // Keywords that indicate a savings category (not a fixed expense)
  const savingsKeywords = ['savings', 'save', 'saving', 'emergency', 'sinking', 'fund', 'rainy']

  // Transform budgets for breakdown display, marking savings categories
  const budgetItems = (budgets || []).map(b => {
    const name = b.categories?.name || 'Uncategorized'
    const isSavings = savingsKeywords.some(keyword =>
      name.toLowerCase().includes(keyword)
    )
    return {
      id: b.id,
      name,
      amount: Number(b.allocated),
      icon: b.categories?.icon || '📦',
      isSavings,
    }
  })

  // Calculate totals separately
  const expenseAllocations = budgetItems
    .filter(b => !b.isSavings)
    .reduce((sum, b) => sum + b.amount, 0)
  const savingsAllocations = budgetItems
    .filter(b => b.isSavings)
    .reduce((sum, b) => sum + b.amount, 0)

  // Calculate minimum debt payments
  const minimumDebtPayments = debts.reduce((total, debt) => total + debt.minimumPayment, 0)

  // Calculate monthly interest charges across all debts
  const monthlyInterest = debts.reduce((total, debt) => {
    return total + (debt.balance * debt.interestRate / 100 / 12)
  }, 0)

  // No debts state
  if (debts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-gray-900">Debt Planner</h1>
        </div>

        <div className="card text-center py-12">
          <div className="w-16 h-16 rounded-full bg-sprout-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-sprout-600" />
          </div>
          <h2 className="font-display text-xl font-semibold text-gray-900 mb-2">No Debts Found</h2>
          <p className="text-gray-500 mb-6">
            Great news! You don&apos;t have any debt accounts to plan for.
          </p>
          <Link
            href="/net-worth/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bloom-500 text-white font-medium hover:bg-bloom-600 transition-colors"
          >
            Add an Account
          </Link>
        </div>
      </div>
    )
  }

  // Transform goals for the client
  const savingsGoals = (goals || []).map(g => ({
    id: g.id,
    name: g.name,
    targetAmount: Number(g.target_amount),
    currentAmount: Number(g.current_amount),
    linkedAccountId: g.linked_account_id,
  }))

  return (
    <DebtPlannerClient
      debts={debts}
      monthlyIncome={Math.round(monthlyIncome)}
      monthlyBills={Math.round(monthlyBills)}
      budgetAllocations={Math.round(budgetAllocations)}
      expenseAllocations={Math.round(expenseAllocations)}
      savingsAllocations={Math.round(savingsAllocations)}
      budgetItems={budgetItems}
      minimumDebtPayments={Math.round(minimumDebtPayments)}
      monthlyInterest={Math.round(monthlyInterest)}
      totalPaidOff={Math.round(totalPaidOff)}
      progressPercent={Math.round(progressPercent)}
      savingsGoals={savingsGoals}
    />
  )
}
