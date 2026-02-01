'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BucketItem } from './bucket-item'
import { AddBucketModal } from './add-bucket-modal'

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
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  function handleAddSuccess() {
    router.refresh()
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center justify-between"
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
        <button
          onClick={() => setShowAddModal(true)}
          className="ml-2 p-2 rounded-lg bg-bloom-50 text-bloom-600 hover:bg-bloom-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-2">
          {buckets.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-3">{emptyMessage}</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-sm font-medium text-bloom-600 hover:text-bloom-700"
              >
                + Add your first {type === 'budget' ? 'budget category' : type === 'savings' ? 'savings goal' : 'account'}
              </button>
            </div>
          ) : (
            buckets.map((bucket) => (
              <BucketItem key={bucket.id} bucket={bucket as never} type={type} />
            ))
          )}
        </div>
      )}

      <AddBucketModal
        type={type}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />
    </section>
  )
}
