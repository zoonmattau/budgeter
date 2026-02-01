import Link from 'next/link'
import { Plus, TrendingUp, TrendingDown, Users, CreditCard, Landmark, Wallet, PiggyBank, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { AccountsList } from '@/components/net-worth/accounts-list'
import { NetWorthHistoryChart } from '@/components/net-worth/net-worth-history-chart'

export default async function NetWorthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('type')
    .order('name')

  // Fetch net worth snapshots for history chart
  const { data: snapshots } = await supabase
    .from('net_worth_snapshots')
    .select('snapshot_date, net_worth, total_assets, total_liabilities')
    .eq('user_id', user.id)
    .order('snapshot_date', { ascending: true })

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

  return (
    <div className="space-y-6">
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

      {/* Net Worth Card */}
      <div className={`card ${netWorth >= 0 ? 'bg-gradient-to-br from-sprout-50 to-bloom-50' : 'bg-gradient-to-br from-red-50 to-coral-50'}`}>
        <p className="text-sm text-gray-600">Total Net Worth</p>
        <p className={`text-4xl font-bold mt-1 ${netWorth >= 0 ? 'text-sprout-600' : 'text-red-600'}`}>
          {formatCurrency(netWorth)}
        </p>

        {/* Assets & Liabilities Summary */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-200/50">
          <div>
            <div className="flex items-center gap-1.5 text-sprout-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Assets</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalAssets)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-red-500 mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs font-medium">Liabilities</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalLiabilities)}</p>
          </div>
        </div>
      </div>

      {/* Social/Leaderboard Link */}
      <Link
        href="/leaderboard"
        className="card flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bloom-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-bloom-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Compare with Friends</p>
            <p className="text-xs text-gray-500">View leaderboards & add friends</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </Link>

      {/* Net Worth History Chart */}
      {snapshots && snapshots.length > 1 && (
        <section className="card">
          <h2 className="font-display font-semibold text-gray-900 mb-4">History</h2>
          <NetWorthHistoryChart data={snapshots} />
        </section>
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
