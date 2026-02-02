'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Wallet, Landmark, CreditCard, TrendingUp, Receipt } from 'lucide-react'
import { getBankLogo } from '@/lib/bank-logos'

type AccountType = 'cash' | 'bank' | 'credit' | 'credit_card' | 'investment' | 'debt' | 'loan'

interface AccountLogoProps {
  institution?: string | null
  type: AccountType
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const typeConfig: Record<AccountType, { icon: typeof Wallet; color: string }> = {
  cash: { icon: Wallet, color: '#22c55e' },
  bank: { icon: Landmark, color: '#3b82f6' },
  credit: { icon: CreditCard, color: '#f97316' },
  credit_card: { icon: CreditCard, color: '#f97316' },
  investment: { icon: TrendingUp, color: '#8b5cf6' },
  debt: { icon: Receipt, color: '#ef4444' },
  loan: { icon: Receipt, color: '#ef4444' },
}

const sizeConfig = {
  sm: { container: 'w-8 h-8', icon: 'w-4 h-4', image: 32 },
  md: { container: 'w-10 h-10', icon: 'w-5 h-5', image: 40 },
  lg: { container: 'w-12 h-12', icon: 'w-6 h-6', image: 48 },
}

export function AccountLogo({
  institution,
  type,
  size = 'md',
  className = '',
}: AccountLogoProps) {
  const [imageError, setImageError] = useState(false)
  const logoPath = getBankLogo(institution)
  const config = typeConfig[type] || typeConfig.bank
  const sizes = sizeConfig[size]
  const Icon = config.icon

  // Show logo if we have one and no error loading it
  if (logoPath && !imageError) {
    return (
      <div
        className={`${sizes.container} rounded-xl flex items-center justify-center overflow-hidden bg-white border border-gray-100 ${className}`}
      >
        <Image
          src={logoPath}
          alt={institution || 'Bank logo'}
          width={sizes.image}
          height={sizes.image}
          className="object-contain p-1"
          onError={() => setImageError(true)}
        />
      </div>
    )
  }

  // Fallback to type-based icon
  return (
    <div
      className={`${sizes.container} rounded-xl flex items-center justify-center ${className}`}
      style={{ backgroundColor: `${config.color}20` }}
    >
      <Icon className={sizes.icon} style={{ color: config.color }} />
    </div>
  )
}
