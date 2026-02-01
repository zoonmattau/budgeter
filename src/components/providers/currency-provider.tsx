'use client'

import { useEffect } from 'react'
import { setDefaultCurrency } from '@/lib/utils'

interface CurrencyProviderProps {
  currency: string
  children: React.ReactNode
}

export function CurrencyProvider({ currency, children }: CurrencyProviderProps) {
  useEffect(() => {
    setDefaultCurrency(currency)
  }, [currency])

  return <>{children}</>
}
