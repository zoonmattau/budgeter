'use client'

import { formatCurrency } from '@/lib/utils'
import { CategoryChip } from '@/components/ui/category-chip'
import { Wallet, PiggyBank, CreditCard, TrendingUp, Banknote } from 'lucide-react'

type BucketType = 'budget' | 'savings' | 'accounts'

interface BucketItemProps {
  bucket: {
    id: string
    name: string
    [key: string]: unknown
  }
  type: BucketType
}

export function BucketItem({ bucket, type }: BucketItemProps) {
  if (type === 'budget') {
    const b = bucket as {
      id: string
      name: string
      allocated: number
      spent: number
      remaining: number
      color: string
      icon: string
    }
    const percentSpent = b.allocated > 0 ? Math.round((b.spent / b.allocated) * 100) : 0
    const isOverBudget = b.remaining < 0

    return (
      <div className="p-3 bg-gray-50 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CategoryChip
              name={b.name}
              color={b.color}
              icon={b.icon}
              size="sm"
              showLabel={false}
            />
            <span className="font-medium text-gray-900">{b.name}</span>
          </div>
          <span className={`font-semibold ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(b.remaining)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              isOverBudget ? 'bg-red-500' : percentSpent > 80 ? 'bg-coral-500' : 'bg-bloom-500'
            }`}
            style={{ width: `${Math.min(percentSpent, 100)}%` }}
          />
        </div>

        <div className="flex justify-between mt-1.5 text-xs text-gray-500">
          <span>{formatCurrency(b.spent)} spent</span>
          <span>{formatCurrency(b.allocated)} budgeted</span>
        </div>
      </div>
    )
  }

  if (type === 'savings') {
    const s = bucket as {
      id: string
      name: string
      current: number
      target: number
      progress: number
      color: string
      icon: string
    }

    return (
      <div className="p-3 bg-gray-50 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CategoryChip
              name={s.name}
              color={s.color}
              icon={s.icon}
              size="sm"
              showLabel={false}
            />
            <span className="font-medium text-gray-900">{s.name}</span>
          </div>
          <span className="font-semibold text-sprout-600">
            {formatCurrency(s.current)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-sprout-500 transition-all"
            style={{ width: `${Math.min(s.progress, 100)}%` }}
          />
        </div>

        <div className="flex justify-between mt-1.5 text-xs text-gray-500">
          <span>{s.progress}% complete</span>
          <span>{formatCurrency(s.target)} target</span>
        </div>
      </div>
    )
  }

  if (type === 'accounts') {
    const a = bucket as {
      id: string
      name: string
      balance: number
      type: string
      institution: string | null
      isAsset: boolean
    }

    const getAccountIcon = () => {
      switch (a.type) {
        case 'bank':
          return <Wallet className="w-4 h-4" />
        case 'cash':
          return <Banknote className="w-4 h-4" />
        case 'credit':
          return <CreditCard className="w-4 h-4" />
        case 'investment':
          return <TrendingUp className="w-4 h-4" />
        default:
          return <PiggyBank className="w-4 h-4" />
      }
    }

    const getAccountColor = () => {
      switch (a.type) {
        case 'bank':
          return 'bg-blue-100 text-blue-600'
        case 'cash':
          return 'bg-green-100 text-green-600'
        case 'credit':
          return 'bg-orange-100 text-orange-600'
        case 'investment':
          return 'bg-purple-100 text-purple-600'
        default:
          return 'bg-gray-100 text-gray-600'
      }
    }

    return (
      <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getAccountColor()}`}>
            {getAccountIcon()}
          </div>
          <div>
            <p className="font-medium text-gray-900">{a.name}</p>
            {a.institution && (
              <p className="text-xs text-gray-500">{a.institution}</p>
            )}
          </div>
        </div>
        <span className={`font-semibold ${a.isAsset ? 'text-gray-900' : 'text-red-600'}`}>
          {a.isAsset ? '' : '-'}{formatCurrency(Math.abs(a.balance))}
        </span>
      </div>
    )
  }

  return null
}
