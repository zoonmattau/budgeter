'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CreditCard, Building2, Wallet, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import type { Tables } from '@/lib/database.types'

interface AccountFilterProps {
  accounts: Tables<'accounts'>[]
  selectedAccountId: string | null
}

const accountIcons: Record<string, React.ReactNode> = {
  bank: <Building2 className="w-4 h-4" />,
  credit: <CreditCard className="w-4 h-4" />,
  credit_card: <CreditCard className="w-4 h-4" />,
  cash: <Wallet className="w-4 h-4" />,
}

export function AccountFilter({ accounts, selectedAccountId }: AccountFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedAccount = accounts.find(a => a.id === selectedAccountId)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (accountId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (accountId) {
      params.set('account', accountId)
    } else {
      params.delete('account')
    }
    router.push(`/transactions?${params.toString()}`)
    setIsOpen(false)
  }

  if (accounts.length === 0) return null

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
      >
        {selectedAccount ? (
          <>
            {accountIcons[selectedAccount.type] || <Wallet className="w-4 h-4" />}
            <span className="max-w-[120px] truncate">{selectedAccount.name}</span>
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">All accounts</span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
          <button
            onClick={() => handleSelect(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${!selectedAccountId ? 'bg-bloom-50 text-bloom-700' : 'text-gray-700'}`}
          >
            <CreditCard className="w-4 h-4" />
            All accounts
          </button>
          <div className="border-t border-gray-100 my-1" />
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => handleSelect(account.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${selectedAccountId === account.id ? 'bg-bloom-50 text-bloom-700' : 'text-gray-700'}`}
            >
              {accountIcons[account.type] || <Wallet className="w-4 h-4" />}
              <span className="truncate">{account.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
