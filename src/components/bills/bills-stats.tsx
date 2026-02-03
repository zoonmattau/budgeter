'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, PieChart, Calendar, DollarSign, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'

type BillWithCategory = Tables<'bills'> & {
  categories: Tables<'categories'> | null
}

interface BillsStatsProps {
  bills: BillWithCategory[]
  totalMonthly: number
}

interface CategoryBreakdown {
  name: string
  color: string
  icon: string | null
  monthlyAmount: number
  count: number
}

export function BillsStats({ bills, totalMonthly }: BillsStatsProps) {
  const [showStats, setShowStats] = useState(false)

  // Calculate yearly total
  const yearlyTotal = totalMonthly * 12

  // Get recurring bills only (exclude one-offs)
  const recurringBills = bills.filter(b => !b.is_one_off)

  // Calculate category breakdown
  const categoryMap = new Map<string, CategoryBreakdown>()
  recurringBills.forEach(bill => {
    const catName = bill.categories?.name || 'Uncategorized'
    const existing = categoryMap.get(catName)

    let monthlyAmount = Number(bill.amount)
    switch (bill.frequency) {
      case 'weekly': monthlyAmount *= 4.33; break
      case 'fortnightly': monthlyAmount *= 2.17; break
      case 'quarterly': monthlyAmount /= 3; break
      case 'yearly': monthlyAmount /= 12; break
    }

    if (existing) {
      existing.monthlyAmount += monthlyAmount
      existing.count += 1
    } else {
      categoryMap.set(catName, {
        name: catName,
        color: bill.categories?.color || '#9CA3AF',
        icon: bill.categories?.icon || null,
        monthlyAmount,
        count: 1,
      })
    }
  })

  const categoryBreakdown = Array.from(categoryMap.values())
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount)

  // Get top 5 most expensive bills (by monthly equivalent)
  const topBills = [...recurringBills]
    .map(bill => {
      let monthlyAmount = Number(bill.amount)
      switch (bill.frequency) {
        case 'weekly': monthlyAmount *= 4.33; break
        case 'fortnightly': monthlyAmount *= 2.17; break
        case 'quarterly': monthlyAmount /= 3; break
        case 'yearly': monthlyAmount /= 12; break
      }
      return { ...bill, monthlyAmount }
    })
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount)
    .slice(0, 5)

  // Group by frequency
  const frequencyBreakdown = {
    weekly: recurringBills.filter(b => b.frequency === 'weekly'),
    fortnightly: recurringBills.filter(b => b.frequency === 'fortnightly'),
    monthly: recurringBills.filter(b => b.frequency === 'monthly'),
    quarterly: recurringBills.filter(b => b.frequency === 'quarterly'),
    yearly: recurringBills.filter(b => b.frequency === 'yearly'),
  }

  // Sinking funds needed (quarterly + yearly bills)
  const sinkingFundBills = recurringBills.filter(b =>
    b.frequency === 'quarterly' || b.frequency === 'yearly'
  )
  const sinkingFundMonthly = sinkingFundBills.reduce((sum, bill) => {
    const amount = Number(bill.amount)
    return sum + (bill.frequency === 'quarterly' ? amount / 3 : amount / 12)
  }, 0)

  if (bills.length === 0) return null

  return (
    <div className="card">
      <button
        onClick={() => setShowStats(!showStats)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-bloom-100">
            <BarChart3 className="w-4 h-4 text-bloom-600" />
          </div>
          <span className="font-semibold text-gray-900">Bill Insights</span>
        </div>
        {showStats ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {showStats && (
        <div className="mt-4 space-y-5">
          {/* Yearly Overview */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-bloom-50 to-sprout-50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-bloom-600" />
              <h3 className="font-medium text-gray-900">Annual Overview</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Monthly</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(totalMonthly)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Yearly</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(yearlyTotal)}</p>
              </div>
            </div>
          </div>

          {/* Sinking Funds Summary */}
          {sinkingFundBills.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-amber-600" />
                <h3 className="font-medium text-gray-900">Sinking Funds Needed</h3>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {sinkingFundBills.length} quarterly/yearly bill{sinkingFundBills.length !== 1 ? 's' : ''} require saving
              </p>
              <p className="text-lg font-bold text-amber-700">
                {formatCurrency(sinkingFundMonthly)}/month
              </p>
            </div>
          )}

          {/* Top Bills */}
          {topBills.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-gray-900">Highest Bills</h3>
              </div>
              <div className="space-y-2">
                {topBills.map((bill, index) => (
                  <div key={bill.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-400 w-5">#{index + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{bill.name}</p>
                        <p className="text-xs text-gray-400">
                          {formatCurrency(bill.amount)} {bill.frequency}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-700">
                      {formatCurrency(bill.monthlyAmount)}/mo
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          {categoryBreakdown.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <PieChart className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-gray-900">By Category</h3>
              </div>
              <div className="space-y-2">
                {categoryBreakdown.map((cat) => {
                  const percentage = totalMonthly > 0 ? (cat.monthlyAmount / totalMonthly) * 100 : 0
                  return (
                    <div key={cat.name} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">{cat.name}</p>
                          <p className="text-sm text-gray-600 ml-2">{formatCurrency(cat.monthlyAmount)}</p>
                        </div>
                        <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: cat.color
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Frequency Breakdown */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gray-500" />
              <h3 className="font-medium text-gray-900">By Frequency</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {frequencyBreakdown.weekly.length > 0 && (
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500">Weekly</p>
                  <p className="font-semibold text-gray-900">{frequencyBreakdown.weekly.length}</p>
                </div>
              )}
              {frequencyBreakdown.fortnightly.length > 0 && (
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500">Fortnightly</p>
                  <p className="font-semibold text-gray-900">{frequencyBreakdown.fortnightly.length}</p>
                </div>
              )}
              {frequencyBreakdown.monthly.length > 0 && (
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500">Monthly</p>
                  <p className="font-semibold text-gray-900">{frequencyBreakdown.monthly.length}</p>
                </div>
              )}
              {frequencyBreakdown.quarterly.length > 0 && (
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500">Quarterly</p>
                  <p className="font-semibold text-gray-900">{frequencyBreakdown.quarterly.length}</p>
                </div>
              )}
              {frequencyBreakdown.yearly.length > 0 && (
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500">Yearly</p>
                  <p className="font-semibold text-gray-900">{frequencyBreakdown.yearly.length}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
