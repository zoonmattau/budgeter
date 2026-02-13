import Link from 'next/link'
import { Plus, TrendingUp, TrendingDown, CreditCard, Landmark, Wallet, PiggyBank, ChevronRight, Calculator } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { AccountsList } from '@/components/net-worth/accounts-list'
import { NetWorthHistoryChart } from '@/components/net-worth/net-worth-history-chart'
import { MomentumCard } from '@/components/net-worth/momentum-card'
import { MilestoneProgress } from '@/components/net-worth/milestone-progress'
import { LeaderboardPreview } from '@/components/leaderboard/leaderboard-preview'
import { format, startOfMonth } from 'date-fns'
import {
  calculateMonthlyChange,
  calculateAvgMonthlyChange,
  getNextMilestone,
  projectArrivalDate,
  generateProjectionData,
} from '@/lib/net-worth-calculations'

export default async function NetWorthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  const [{ data: accounts }, { data: snapshots }, { data: goals }, { data: incomeEntries }, { data: budgets }, { data: bills }, { data: friendsLeaderboard }, { data: globalLeaderboard }] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('type')
      .order('name'),
    supabase
      .from('net_worth_snapshots')
      .select('snapshot_date, net_worth, total_assets, total_liabilities')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: true }),
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active'),
    // Income for projection
    supabase
      .from('income_entries')
      .select('amount')
      .eq('user_id', user.id)
      .eq('month', currentMonth),
    // Budget allocations for projection
    supabase
      .from('budgets')
      .select('allocated')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .is('household_id', null),
    // Active bills for fixed costs
    supabase
      .from('bills')
      .select('amount, frequency')
      .eq('user_id', user.id)
      .is('household_id', null)
      .eq('is_active', true),
    // Leaderboard data
    supabase.rpc('get_friends_leaderboard', { p_user_id: user.id }),
    supabase.rpc('get_global_leaderboard', { p_limit: 100 }),
  ])

  // Create/update today's snapshot if there are accounts
  if (accounts && accounts.length > 0) {
    const { error: snapshotError } = await supabase.rpc('create_net_worth_snapshot', { p_user_id: user.id })
    if (snapshotError) {
      console.error('Error creating net worth snapshot:', snapshotError)
    }
  }

  // Group accounts by type
  const bankAccounts = accounts?.filter(a => a.type === 'bank' || a.type === 'cash') || []
  const investments = accounts?.filter(a => a.type === 'investment') || []
  const creditCards = accounts?.filter(a => a.type === 'credit' || a.type === 'credit_card') || []
  const loans = accounts?.filter(a => a.type === 'debt' || a.type === 'loan') || []

  const assets = accounts?.filter(a => a.is_asset) || []
  const liabilities = accounts?.filter(a => !a.is_asset) || []

  const totalAssets = assets.reduce((sum, a) => sum + Number(a.balance), 0)
  const totalLiabilities = liabilities.reduce((sum, a) => sum + Number(a.balance), 0)
  const netWorth = totalAssets - totalLiabilities

  // Calculations for momentum, projections, milestones
  const snapshotData = snapshots || []
  const hasEnoughSnapshots = snapshotData.length >= 2

  const { monthlyChange, lastMonthChange } = hasEnoughSnapshots
    ? calculateMonthlyChange(snapshotData, netWorth)
    : { monthlyChange: 0, lastMonthChange: null }

  const historicalAvgChange = hasEnoughSnapshots
    ? calculateAvgMonthlyChange(snapshotData, netWorth)
    : 0

  // Compute budget-based monthly surplus: income - spending - debt payments
  const totalMonthlyIncome = (incomeEntries || []).reduce((sum, e) => sum + Number(e.amount), 0)
  const totalBudgetAllocated = (budgets || []).reduce((sum, b) => sum + Number(b.allocated), 0)
  const frequencyToMonthly: Record<string, number> = {
    weekly: 4.33, fortnightly: 2.17, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12,
  }
  const debtAccountsList = (accounts || []).filter(a =>
    (a.type === 'credit' || a.type === 'credit_card' || a.type === 'debt' || a.type === 'loan') && a.balance > 0
  )
  const monthlyDebtPayments = debtAccountsList.reduce((total, a) => {
    if (!a.minimum_payment) return total
    const multiplier = frequencyToMonthly[a.payment_frequency || 'monthly'] || 1
    return total + (Number(a.minimum_payment) * multiplier)
  }, 0)
  const monthlySinkingFunds = (bills || [])
    .filter(b => b.frequency === 'quarterly' || b.frequency === 'yearly')
    .reduce((sum, b) => sum + Number(b.amount) / (b.frequency === 'yearly' ? 12 : 3), 0)

  const budgetSurplus = totalMonthlyIncome > 0
    ? totalMonthlyIncome - totalBudgetAllocated - monthlyDebtPayments - monthlySinkingFunds
    : 0

  // Use whichever is more informed: budget surplus (if income is set up) or historical average
  // Add debt payments back since paying debt also increases net worth
  const budgetBasedChange = budgetSurplus + monthlyDebtPayments
  const avgMonthlyChange = totalMonthlyIncome > 0 && budgetBasedChange > 0
    ? budgetBasedChange
    : historicalAvgChange

  const activeGoals = (goals || []).map(g => ({
    id: g.id,
    name: g.name,
    target_amount: Number(g.target_amount),
    goal_type: g.goal_type as 'savings' | 'debt_payoff' | 'net_worth_milestone',
  }))

  const milestone = getNextMilestone(netWorth, activeGoals)

  const projectedArrival = milestone
    ? projectArrivalDate(netWorth, milestone.amount, avgMonthlyChange)
    : null

  const projectionData = milestone && avgMonthlyChange > 0
    ? generateProjectionData(netWorth, avgMonthlyChange, milestone.amount)
    : []

  // Goals for chart reference lines
  const chartGoals = (goals || []).map(g => ({
    id: g.id,
    name: g.name,
    target_amount: Number(g.target_amount),
    goal_type: g.goal_type,
  }))

  // Leaderboard ranking computation
  // Simulated entries for global leaderboard (same logic as leaderboard page)
  const today = new Date()
  const lbSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  let lbState = lbSeed
  function lbRand() {
    lbState = (lbState * 1664525 + 1013904223) & 0x7fffffff
    return lbState / 0x7fffffff
  }
  const simulatedNWs: number[] = []
  for (let i = 0; i < 100; i++) {
    const r = lbRand()
    let nw: number
    if (r < 0.20) nw = -Math.round(lbRand() * 30000 + 500)
    else if (r < 0.50) nw = Math.round(lbRand() * 20000)
    else if (r < 0.80) nw = Math.round(lbRand() * 80000 + 20000)
    else if (r < 0.95) nw = Math.round(lbRand() * 400000 + 100000)
    else nw = Math.round(lbRand() * 500000 + 500000)
    simulatedNWs.push(nw)
  }

  const globalEntriesRaw = globalLeaderboard || []
  const friendsEntriesRaw = friendsLeaderboard || []
  const userGlobalEntry = globalEntriesRaw.find((e: { user_id: string }) => e.user_id === user.id)
  const userFriendsEntry = friendsEntriesRaw.find((e: { user_id: string }) => e.user_id === user.id)
  const userLBNetWorth = Number(userGlobalEntry?.net_worth ?? userFriendsEntry?.net_worth ?? netWorth)

  const realGlobalNWs = globalEntriesRaw
    .filter((e: { user_id: string }) => e.user_id !== user.id)
    .map((e: { net_worth: number }) => Number(e.net_worth))
  const allGlobalNWs = [...simulatedNWs, ...realGlobalNWs]
  const globalRank = allGlobalNWs.filter(nw => nw > userLBNetWorth).length + 1
  const globalTotal = allGlobalNWs.length + 1

  const realFriendsNWs: number[] = friendsEntriesRaw
    .filter((e: { user_id: string }) => e.user_id !== user.id)
    .map((e: { net_worth: number }) => Number(e.net_worth))
  const friendsRank = realFriendsNWs.filter((nw: number) => nw > userLBNetWorth).length + 1
  const friendsTotal = realFriendsNWs.length + 1

  // Build display entries - global (anonymous)
  const sortedGlobalNWs = allGlobalNWs.sort((a, b) => b - a)
  const globalDisplayRaw = sortedGlobalNWs.map((nw, i) => ({
    rank: i + 1, isUser: false, displayName: null as string | null, netWorth: nw,
  }))
  globalDisplayRaw.splice(globalRank - 1, 0, { rank: globalRank, isUser: true, displayName: null, netWorth: userLBNetWorth })
  const globalDisplay = globalDisplayRaw.map((e, i) => ({ ...e, rank: i + 1 }))

  // Friends (named)
  const sortedFriendsRaw = friendsEntriesRaw
    .sort((a: { net_worth: number }, b: { net_worth: number }) => Number(b.net_worth) - Number(a.net_worth))
    .map((e: { user_id: string; display_name: string; net_worth: number }, i: number) => ({
      rank: i + 1,
      isUser: e.user_id === user.id,
      displayName: e.user_id === user.id ? 'You' : (e.display_name || 'Friend'),
      netWorth: Number(e.net_worth),
    }))
  const userInFriends = sortedFriendsRaw.some((e: { isUser: boolean }) => e.isUser)
  const friendsDisplay = userInFriends
    ? sortedFriendsRaw
    : (() => {
        const list = [...sortedFriendsRaw]
        list.splice(friendsRank - 1, 0, { rank: friendsRank, isUser: true, displayName: 'You', netWorth: userLBNetWorth })
        return list.map((e: { rank: number; isUser: boolean; displayName: string | null; netWorth: number | null }, i: number) => ({ ...e, rank: i + 1 }))
      })()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Net Worth</h1>
          <p className="text-gray-500 text-sm mt-1">Your financial snapshot</p>
        </div>
        <Link href="/net-worth/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Add
        </Link>
      </div>

      {/* Hero Net Worth Number */}
      <div className={`card text-center ${netWorth >= 0 ? 'bg-gradient-to-br from-sprout-50 to-bloom-50' : 'bg-gradient-to-br from-red-50 to-coral-50'}`}>
        <p className="text-sm text-gray-600">Total Net Worth</p>
        <p className={`text-5xl font-bold mt-1 ${netWorth >= 0 ? 'text-sprout-600' : 'text-red-600'}`}>
          {formatCurrency(netWorth)}
        </p>
      </div>

      {/* Momentum Card */}
      {hasEnoughSnapshots && (monthlyChange !== 0 || lastMonthChange !== null) && (
        <MomentumCard
          monthlyChange={monthlyChange}
          lastMonthChange={lastMonthChange}
          netWorth={netWorth}
        />
      )}

      {/* Net Worth History Chart — "Your Journey" */}
      {snapshotData.length > 1 && (
        <section className="card">
          <h2 className="font-display font-semibold text-gray-900 mb-4">Your Journey</h2>
          <NetWorthHistoryChart
            data={snapshotData}
            projectionData={projectionData}
            nextMilestone={milestone || undefined}
            goals={chartGoals}
          />
        </section>
      )}

      {/* Milestone Progress */}
      {milestone && hasEnoughSnapshots && (
        <MilestoneProgress
          currentNetWorth={netWorth}
          nextMilestone={milestone.amount}
          milestoneName={milestone.name}
          projectedArrivalDate={projectedArrival ? projectedArrival.toISOString() : null}
          avgMonthlyChange={avgMonthlyChange}
          lowestNetWorth={Math.min(...snapshotData.map(s => Number(s.net_worth)), netWorth)}
        />
      )}

      {/* Debt Planner Link */}
      {netWorth < 0 && totalLiabilities > 0 && (
        <Link
          href="/debt-planner"
          className="card flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Debt Payoff Planner</p>
              <p className="text-xs text-gray-500">Create a plan to become debt-free</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-600" />
        </Link>
      )}

      {/* Leaderboard Preview */}
      <LeaderboardPreview
        globalRank={globalRank}
        globalTotal={globalTotal}
        globalEntries={globalDisplay}
        friendsRank={friendsRank}
        friendsTotal={friendsTotal}
        friendsEntries={friendsDisplay}
      />

      {/* Assets & Liabilities Summary (moved from hero) */}
      {(accounts?.length ?? 0) > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card">
            <div className="flex items-center gap-1.5 text-sprout-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Assets</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalAssets)}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-1.5 text-red-500 mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs font-medium">Liabilities</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalLiabilities)}</p>
          </div>
        </div>
      )}

      {/* Bank Accounts & Cash */}
      {bankAccounts.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-blue-500" />
            <h2 className="font-display font-semibold text-gray-900">Bank Accounts</h2>
          </div>
          <AccountsList accounts={bankAccounts} />
        </section>
      )}

      {/* Investments */}
      {investments.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <PiggyBank className="w-4 h-4 text-sprout-500" />
            <h2 className="font-display font-semibold text-gray-900">Investments</h2>
          </div>
          <AccountsList accounts={investments} />
        </section>
      )}

      {/* Credit Cards */}
      {creditCards.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-purple-500" />
            <h2 className="font-display font-semibold text-gray-900">Credit Cards</h2>
          </div>
          <AccountsList accounts={creditCards} showInterestInfo />
        </section>
      )}

      {/* Loans */}
      {loans.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Landmark className="w-4 h-4 text-red-500" />
            <h2 className="font-display font-semibold text-gray-900">Loans</h2>
          </div>
          <AccountsList accounts={loans} showInterestInfo />
        </section>
      )}

      {accounts?.length === 0 && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="font-display text-lg font-semibold text-gray-900 mb-1">No accounts yet</h3>
          <p className="text-gray-500 text-sm mb-6">Add your bank accounts, credit cards, and loans</p>
          <Link href="/net-worth/new" className="btn-primary inline-flex">
            <Plus className="w-4 h-4" />
            Add Your First Account
          </Link>
        </div>
      )}
    </div>
  )
}
