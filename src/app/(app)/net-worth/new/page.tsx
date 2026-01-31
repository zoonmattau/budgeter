'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Wallet, Landmark, CreditCard, TrendingUp, Receipt } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const accountTypes = [
  { value: 'bank', label: 'Bank Account', icon: Landmark, isAsset: true },
  { value: 'cash', label: 'Cash', icon: Wallet, isAsset: true },
  { value: 'investment', label: 'Investment', icon: TrendingUp, isAsset: true },
  { value: 'credit', label: 'Credit Card', icon: CreditCard, isAsset: false },
  { value: 'debt', label: 'Debt/Loan', icon: Receipt, isAsset: false },
]

export default function NewAccountPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [type, setType] = useState('bank')
  const [balance, setBalance] = useState('')
  const [institution, setInstitution] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const selectedType = accountTypes.find(t => t.value === type)!

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !balance) return

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('accounts').insert({
      user_id: user.id,
      name,
      type: type as 'cash' | 'bank' | 'credit' | 'investment' | 'debt',
      balance: parseFloat(balance),
      is_asset: selectedType.isAsset,
      institution: institution || null,
    })

    if (!error) {
      router.push('/net-worth')
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/net-worth" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <h1 className="font-display text-2xl font-bold text-gray-900">Add Account</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Account Type</label>
          <div className="grid grid-cols-2 gap-2">
            {accountTypes.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    type === t.value
                      ? 'border-bloom-500 bg-bloom-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${type === t.value ? 'text-bloom-600' : 'text-gray-400'}`} />
                  <p className={`text-sm font-medium ${type === t.value ? 'text-bloom-700' : 'text-gray-700'}`}>
                    {t.label}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t.isAsset ? 'Asset' : 'Liability'}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="label">Account Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Everyday Account"
            className="input"
            required
          />
        </div>

        <div>
          <label className="label">
            {selectedType.isAsset ? 'Current Balance' : 'Amount Owed'}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
              className="input pl-8 text-lg font-semibold"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Institution (optional)</label>
          <input
            type="text"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="e.g., CommBank, ANZ"
            className="input"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !name || !balance}
          className="btn-primary w-full"
        >
          {loading ? 'Adding...' : 'Add Account'}
        </button>
      </form>
    </div>
  )
}
