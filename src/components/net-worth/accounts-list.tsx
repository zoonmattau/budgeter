'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Percent, AlertTriangle, Settings } from 'lucide-react'
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
  bank: 'Bank',
  credit: 'Credit Card',
  credit_card: 'Credit Card',
  investment: 'Investment',
  debt: 'Loan',
  loan: 'Loan',
}

const typeBadgeColors: Record<string, string> = {
  cash: 'bg-emerald-50 text-emerald-700',
  bank: 'bg-blue-50 text-blue-700',
  credit: 'bg-purple-50 text-purple-700',
  credit_card: 'bg-purple-50 text-purple-700',
  investment: 'bg-sprout-50 text-sprout-700',
  debt: 'bg-red-50 text-red-700',
  loan: 'bg-red-50 text-red-700',
}

export function AccountsList({ accounts, showInterestInfo = false }: AccountsListProps) {
  const router = useRouter()

  return (
    <div className="card divide-y divide-gray-50">
      {accounts.map((account) => {
        const typeLabel = typeLabels[account.type] || typeLabels.bank
        const isCreditCard = account.type === 'credit' || account.type === 'credit_card'
        const creditLimit = account.credit_limit || 0
        const utilization = creditLimit > 0 ? (account.balance / creditLimit) * 100 : 0
        const isNearLimit = utilization >= 75
        const isOverLimit = utilization >= 100

        return (
          <Link
            key={account.id}
            href={`/transactions?account=${account.id}`}
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
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 group-hover:text-bloom-600 transition-colors">
                      {account.name}
                    </p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeBadgeColors[account.type] || 'bg-gray-100 text-gray-600'}`}>
                      {typeLabel}
                    </span>
                  </div>
                  {account.institution && (
                    <p className="text-xs text-gray-400">
                      {account.institution}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isCreditCard && isNearLimit && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                    isOverLimit ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    <AlertTriangle className="w-3 h-3" />
                    {isOverLimit ? 'Over limit' : `${Math.round(utilization)}% used`}
                  </span>
                )}
                <p className={`font-semibold ${account.is_asset ? 'text-gray-900' : 'text-red-600'}`}>
                  {account.is_asset ? '' : '-'}{formatCurrency(account.balance)}
                </p>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    router.push(`/net-worth/${account.id}/edit`)
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Edit account"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-bloom-500 transition-colors" />
              </div>
            </div>

            {/* Credit limit progress bar */}
            {isCreditCard && creditLimit > 0 && (
              <div className="mt-2 ml-13">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>{formatCurrency(account.balance)} of {formatCurrency(creditLimit)}</span>
                  <span>{formatCurrency(Math.max(0, creditLimit - account.balance))} available</span>
                </div>
                <div className="h-1.5 bg-red-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all bg-red-500"
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  />
                </div>
              </div>
            )}

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
