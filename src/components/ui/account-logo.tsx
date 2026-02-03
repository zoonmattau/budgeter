'use client'

import { useState } from 'react'
import { Wallet, Landmark, CreditCard, TrendingUp, Receipt } from 'lucide-react'

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
  sm: { container: 'w-8 h-8', icon: 'w-4 h-4', image: 32, text: 'text-xs' },
  md: { container: 'w-10 h-10', icon: 'w-5 h-5', image: 40, text: 'text-sm' },
  lg: { container: 'w-12 h-12', icon: 'w-6 h-6', image: 48, text: 'text-base' },
}

// Domain mappings for common Australian institutions
const institutionDomains: Record<string, string> = {
  'commbank': 'commbank.com.au',
  'commonwealth': 'commbank.com.au',
  'cba': 'commbank.com.au',
  'anz': 'anz.com.au',
  'westpac': 'westpac.com.au',
  'nab': 'nab.com.au',
  'ing': 'ing.com.au',
  'macquarie': 'macquarie.com',
  'bendigo': 'bendigobank.com.au',
  'suncorp': 'suncorp.com.au',
  'bankwest': 'bankwest.com.au',
  'stgeorge': 'stgeorge.com.au',
  'st george': 'stgeorge.com.au',
  'ubank': 'ubank.com.au',
  'up': 'up.com.au',
  'hsbc': 'hsbc.com.au',
  'citibank': 'citibank.com.au',
  'citi': 'citibank.com.au',
  'boq': 'boq.com.au',
  'bank of queensland': 'boq.com.au',
  'netflix': 'netflix.com',
  'spotify': 'spotify.com',
  'amazon': 'amazon.com',
  'apple': 'apple.com',
  'google': 'google.com',
  'microsoft': 'microsoft.com',
  'visa': 'visa.com',
  'mastercard': 'mastercard.com',
  'amex': 'americanexpress.com',
  'american express': 'americanexpress.com',
  'paypal': 'paypal.com',
  'vanguard': 'vanguard.com.au',
  'betashares': 'betashares.com.au',
  'spaceship': 'spaceship.com.au',
  'raiz': 'raizinvest.com.au',
  'stake': 'stake.com.au',
}

function getDomainFromInstitution(institution: string): string | null {
  const normalized = institution.toLowerCase().trim()

  // Check direct mapping
  for (const [key, domain] of Object.entries(institutionDomains)) {
    if (normalized.includes(key)) {
      return domain
    }
  }

  // Try to construct domain from name
  const cleaned = normalized.replace(/[^a-z0-9]/g, '')
  if (cleaned.length >= 3) {
    return `${cleaned}.com`
  }

  return null
}

export function AccountLogo({
  institution,
  type,
  size = 'md',
  className = '',
}: AccountLogoProps) {
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const config = typeConfig[type] || typeConfig.bank
  const sizes = sizeConfig[size]
  const Icon = config.icon

  // Get logo URL for institution using Google's favicon service
  const domain = institution ? getDomainFromInstitution(institution) : null
  // Google favicon service is more reliable than Clearbit for Australian banks
  const logoUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null

  // Render the fallback (shown by default, hidden when logo loads)
  const renderFallback = () => {
    if (institution && institution.length > 0) {
      const initial = institution.charAt(0).toUpperCase()
      return (
        <div
          className={`${sizes.container} rounded-xl flex items-center justify-center font-bold ${sizes.text} text-white ${className}`}
          style={{ backgroundColor: config.color }}
        >
          {initial}
        </div>
      )
    }

    return (
      <div
        className={`${sizes.container} rounded-xl flex items-center justify-center ${className}`}
        style={{ backgroundColor: `${config.color}20` }}
      >
        <Icon className={sizes.icon} style={{ color: config.color }} />
      </div>
    )
  }

  // If no logo URL or logo failed, show fallback
  if (!logoUrl || logoError) {
    return renderFallback()
  }

  // Show fallback while loading, then swap to logo when loaded
  return (
    <div className="relative">
      {/* Fallback shown until logo loads */}
      {!logoLoaded && renderFallback()}

      {/* Logo image - hidden until loaded */}
      <div
        className={`${sizes.container} rounded-xl flex items-center justify-center overflow-hidden bg-white border border-gray-100 ${className} ${
          logoLoaded ? '' : 'absolute opacity-0 pointer-events-none'
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={institution || 'Logo'}
          className="w-full h-full object-contain p-1"
          onLoad={() => setLogoLoaded(true)}
          onError={() => setLogoError(true)}
        />
      </div>
    </div>
  )
}
