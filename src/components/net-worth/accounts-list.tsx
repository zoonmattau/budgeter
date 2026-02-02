'use client'

import Link from 'next/link'
import { ChevronRight, Percent } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { AccountLogo } from '@/components/ui/account-logo'
import type { Tables } from '@/lib/database.types'

interface AccountsListProps {
  accounts: Tables<'accounts'>[]
  showInterestInfo?: boolean
}

const typeLabels: Record<string, string> = {
  cash: 'Cash',
  bank: 'Bank Account',
  credit: 'Credit Card',
  credit_card: 'Credit Card',
  investment: 'Investment',
  debt: 'Loan',
  loan: 'Loan',
}

export function AccountsList({ accounts, showInterestInfo = false }: AccountsListProps) {
  return (
    <div className="card divide-y divide-gray-50">
      {accounts.map((account) => {
        const typeLabel = typeLabels[account.type] || typeLabels.bank

        return (
          <Link
            key={account.id}
            href={`/net-worth/${account.id}/edit`}
            className="block py-3 first:pt-0 last:pb-0 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AccountLogo
                  institution={account.institution}
                  type={account.type as 'cash' | 'bank' | 'credit' | 'credit_card' | 'investment' | 'debt' | 'loan'}
                  size="md"
                />
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-bloom-600 transition-colors">
                    {account.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {account.institution || typeLabel}
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
  // Handle special cases for 11, 12, 13 (and 111, 112, 113, etc.)
  const lastTwo = Math.abs(n) % 100
  if (lastTwo >= 11 && lastTwo <= 13) {
    return 'th'
  }

  // Handle normal cases based on last digit
  const lastDigit = Math.abs(n) % 10
  switch (lastDigit) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}
