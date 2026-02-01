'use client'

import Link from 'next/link'
import { Wallet, Landmark, CreditCard, TrendingUp, Receipt, ChevronRight, Percent } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import type { Tables } from '@/lib/database.types'

interface AccountsListProps {
  accounts: Tables<'accounts'>[]
  showInterestInfo?: boolean
}

const typeConfig: Record<string, { icon: typeof Wallet; label: string; color: string }> = {
  cash: { icon: Wallet, label: 'Cash', color: '#22c55e' },
  bank: { icon: Landmark, label: 'Bank Account', color: '#3b82f6' },
  credit: { icon: CreditCard, label: 'Credit Card', color: '#f97316' },
  credit_card: { icon: CreditCard, label: 'Credit Card', color: '#f97316' },
  investment: { icon: TrendingUp, label: 'Investment', color: '#8b5cf6' },
  debt: { icon: Receipt, label: 'Loan', color: '#ef4444' },
  loan: { icon: Receipt, label: 'Loan', color: '#ef4444' },
}

export function AccountsList({ accounts, showInterestInfo = false }: AccountsListProps) {
  return (
    <div className="card divide-y divide-gray-50">
      {accounts.map((account) => {
        const config = typeConfig[account.type] || typeConfig.bank
        const Icon = config.icon

        return (
          <Link
            key={account.id}
            href={`/net-worth/${account.id}/edit`}
            className="block py-3 first:pt-0 last:pb-0 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${config.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: config.color }} />
                </div>
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-bloom-600 transition-colors">
                    {account.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {account.institution || config.label}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className={`font-semibold ${account.is_asset ? 'text-gray-900' : 'text-red-600'}`}>
                  {account.is_asset ? '' : '-'}{formatCurrency(account.balance)}
                </p>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-bloom-500 transition-colors" />
              </div>
            </div>

            {/* Interest & payment info for loans/credit cards */}
            {showInterestInfo && (account.interest_rate || account.due_date || account.payoff_date) && (
              <div className="mt-2 ml-13 flex flex-wrap gap-3 text-xs text-gray-500">
                {account.interest_rate && (
                  <span className="flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    {account.interest_rate}% p.a.
                  </span>
                )}
                {account.due_date && (
                  <span>Due: {account.due_date}{getOrdinalSuffix(account.due_date)} of month</span>
                )}
                {account.minimum_payment && (
                  <span>Min: {formatCurrency(account.minimum_payment)}</span>
                )}
                {account.payoff_date && (
                  <span>Payoff: {format(new Date(account.payoff_date), 'MMM yyyy')}</span>
                )}
              </div>
            )}
          </Link>
        )
      })}
    </div>
  )
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
