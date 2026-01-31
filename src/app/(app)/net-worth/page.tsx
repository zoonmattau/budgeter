import Link from 'next/link'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { AccountsList } from '@/components/net-worth/accounts-list'

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
          <p className="text-gray-500 text-sm mt-1">Track your financial health</p>
        </div>
        <Link href="/net-worth/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Account
        </Link>
      </div>

      {/* Net Worth Card */}
      <div className={`card ${netWorth >= 0 ? 'bg-gradient-to-br from-sprout-50 to-bloom-50' : 'bg-gradient-to-br from-red-50 to-coral-50'}`}>
        <p className="text-sm text-gray-600">Total Net Worth</p>
        <p className={`text-4xl font-bold mt-1 ${netWorth >= 0 ? 'text-sprout-600' : 'text-red-600'}`}>
          {formatCurrency(netWorth)}
        </p>
      </div>

      {/* Assets & Liabilities Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="flex items-center gap-2 text-sprout-600 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Assets</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAssets)}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <TrendingDown className="w-4 h-4" />
            <span className="text-sm font-medium">Liabilities</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalLiabilities)}</p>
        </div>
      </div>

      {/* Accounts Lists */}
      {assets.length > 0 && (
        <section>
          <h2 className="font-display font-semibold text-gray-900 mb-3">Assets</h2>
          <AccountsList accounts={assets} />
        </section>
      )}

      {liabilities.length > 0 && (
        <section>
          <h2 className="font-display font-semibold text-gray-900 mb-3">Liabilities</h2>
          <AccountsList accounts={liabilities} />
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
          <p className="text-gray-500 text-sm mb-6">Add your bank accounts, investments, and debts</p>
          <Link href="/net-worth/new" className="btn-primary inline-flex">
            <Plus className="w-4 h-4" />
            Add Your First Account
          </Link>
        </div>
      )}
    </div>
  )
}
