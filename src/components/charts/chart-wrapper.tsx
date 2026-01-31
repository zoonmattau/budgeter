'use client'

import { ResponsiveContainer } from 'recharts'
import { ReactNode } from 'react'

interface ChartWrapperProps {
  children: ReactNode
  height?: number
  loading?: boolean
}

export function ChartWrapper({ children, height = 250, loading }: ChartWrapperProps) {
  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-xl animate-pulse"
        style={{ height }}
      >
        <p className="text-gray-400 text-sm">Loading chart...</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      {children}
    </ResponsiveContainer>
  )
}
