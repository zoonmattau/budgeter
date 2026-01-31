'use client'

import { Wallet, Landmark, CreditCard, TrendingUp, Receipt } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'

interface AccountsListProps {
  accounts: Tables<'accounts'>[]
}

const typeConfig = {
  cash: { icon: Wallet, label: 'Cash', color: '#22c55e' },
  bank: { icon: Landmark, label: 'Bank Account', color: '#3b82f6' },
  credit: { icon: CreditCard, label: 'Credit Card', color: '#f97316' },
  investment: { icon: TrendingUp, label: 'Investment', color: '#8b5cf6' },
  debt: { icon: Receipt, label: 'Debt/Loan', color: '#ef4444' },
}

export function AccountsList({ accounts }: AccountsListProps) {
  return (
    <div className="card divide-y divide-gray-50">
      {accounts.map((account) => {
        const config = typeConfig[account.type]
        const Icon = config.icon

        return (
          <div key={account.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${config.color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color: config.color }} />
              </div>
              <div>
                <p className="font-medium text-gray-900">{account.name}</p>
                <p className="text-xs text-gray-400">
                  {account.institution || config.label}
                </p>
              </div>
            </div>
            <p className={`font-semibold ${account.is_asset ? 'text-gray-900' : 'text-red-600'}`}>
              {account.is_asset ? '' : '-'}{formatCurrency(account.balance)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
