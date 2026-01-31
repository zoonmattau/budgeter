'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { BucketItem } from './bucket-item'

interface BudgetBucket {
  id: string
  name: string
  allocated: number
  spent: number
  remaining: number
  color: string
  icon: string
}

interface SavingsBucket {
  id: string
  name: string
  current: number
  target: number
  progress: number
  color: string
  icon: string
}

interface AccountBucket {
  id: string
  name: string
  balance: number
  type: string
  institution: string | null
  isAsset: boolean
}

type BucketType = 'budget' | 'savings' | 'accounts'

interface BucketSectionProps {
  title: string
  subtitle: string
  type: BucketType
  buckets: BudgetBucket[] | SavingsBucket[] | AccountBucket[]
  emptyMessage: string
}

export function BucketSection({
  title,
  subtitle,
  type,
  buckets,
  emptyMessage,
}: BucketSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <section className="card">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-3"
      >
        <div>
          <h2 className="font-display font-semibold text-gray-900 text-left">{title}</h2>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-2">
          {buckets.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">{emptyMessage}</p>
          ) : (
            buckets.map((bucket) => (
              <BucketItem key={bucket.id} bucket={bucket as never} type={type} />
            ))
          )}
        </div>
      )}
    </section>
  )
}
