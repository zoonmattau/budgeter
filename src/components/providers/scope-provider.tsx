'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ScopeContext, ViewScope, HouseholdMember } from '@/lib/scope-context'

interface ScopeProviderProps {
  children: React.ReactNode
  initialHouseholdId: string | null
  initialHouseholdName: string | null
  initialMembers: HouseholdMember[]
}

export function ScopeProvider({
  children,
  initialHouseholdId,
  initialHouseholdName,
  initialMembers,
}: ScopeProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isInHousehold = Boolean(initialHouseholdId)

  // Initialize scope from URL params, defaulting to personal
  const initialScope: ViewScope =
    searchParams.get('scope') === 'household' && isInHousehold
      ? 'household'
      : 'personal'

  const [scope, setScopeState] = useState<ViewScope>(initialScope)

  // Sync scope with URL on mount and when URL changes
  useEffect(() => {
    const urlScope = searchParams.get('scope')
    if (urlScope === 'household' && isInHousehold) {
      setScopeState('household')
    } else if (urlScope === 'personal' || !urlScope) {
      setScopeState('personal')
    }
  }, [searchParams, isInHousehold])

  const setScope = useCallback((newScope: ViewScope) => {
    setScopeState(newScope)

    // Update URL params
    const params = new URLSearchParams(searchParams.toString())
    if (newScope === 'household') {
      params.set('scope', 'household')
    } else {
      params.delete('scope')
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.push(newUrl)
  }, [pathname, router, searchParams])

  const value = useMemo(() => ({
    scope,
    setScope,
    householdId: initialHouseholdId,
    householdName: initialHouseholdName,
    members: initialMembers,
    isInHousehold,
  }), [scope, setScope, initialHouseholdId, initialHouseholdName, initialMembers, isInHousehold])

  return (
    <ScopeContext.Provider value={value}>
      {children}
    </ScopeContext.Provider>
  )
}
