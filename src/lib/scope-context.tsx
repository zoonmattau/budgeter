'use client'

import { createContext, useContext } from 'react'

export type ViewScope = 'personal' | 'household'

export interface HouseholdMember {
  user_id: string
  display_name: string | null
  role: 'owner' | 'member'
}

export interface ScopeContextValue {
  scope: ViewScope
  setScope: (scope: ViewScope) => void
  householdId: string | null
  householdName: string | null
  members: HouseholdMember[]
  isInHousehold: boolean
}

export const ScopeContext = createContext<ScopeContextValue | null>(null)

export function useScope() {
  const context = useContext(ScopeContext)
  if (!context) {
    throw new Error('useScope must be used within a ScopeProvider')
  }
  return context
}

// Optional hook that doesn't throw if outside provider
export function useScopeOptional() {
  return useContext(ScopeContext)
}

// Helper to get member color based on index
export function getMemberColor(index: number): string {
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-cyan-500',
  ]
  return colors[index % colors.length]
}

export function getMemberColorHex(index: number): string {
  const colors = [
    '#3b82f6', // blue-500
    '#a855f7', // purple-500
    '#22c55e', // green-500
    '#f97316', // orange-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
  ]
  return colors[index % colors.length]
}
