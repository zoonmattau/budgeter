'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { format, startOfMonth } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { logPaydayIncome } from '@/app/actions/payday'
import type { Tables } from '@/lib/database.types'

interface PaydayModalProps {
  recurringIncome: Tables<'income_entries'>[]
  userId: string
}

export function PaydayModal({ recurringIncome, userId }: PaydayModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [stage, setStage] = useState<'review' | 'done'>('review')
  const [loading, setLoading] = useState(false)
  const [amounts, setAmounts] = useState<Record<string, number>>(
    Object.fromEntries(recurringIncome.map(e => [e.id, Number(e.amount)]))
  )
  const router = useRouter()

  const monthLabel = format(startOfMonth(new Date()), 'MMMM yyyy')
  const total = Object.values(amounts).reduce((s, a) => s + a, 0)

  async function handleLog() {
    setLoading(true)
    const entries = recurringIncome.map(e => ({
      source: e.source,
      amount: amounts[e.id] ?? Number(e.amount),
    }))
    await logPaydayIncome(userId, entries)
    setStage('done')
    setLoading(false)
  }

  function handleClose() {
    setIsOpen(false)
    setTimeout(() => setStage('review'), 300)
    router.refresh()
  }

  const CELEBRATION = ['💰', '💵', '✨', '🎉', '💚']

  return (
    <>
      {/* Trigger card */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full text-left card bg-gradient-to-r from-sprout-50 to-bloom-50 border border-sprout-200 flex items-center gap-3 hover:shadow-md transition-shadow"
      >
        <span className="text-3xl">💰</span>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">It&apos;s Payday!</p>
          <p className="text-sm text-gray-500">Log your income for {monthLabel}</p>
        </div>
        <span className="text-xs font-medium text-sprout-600 bg-sprout-100 px-2 py-1 rounded-full flex-shrink-0">
          Tap →
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
            {stage === 'review' ? (
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💰</span>
                    <h2 className="font-display text-xl font-bold text-gray-900">Payday!</h2>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-6 ml-9">{monthLabel}</p>

                {/* Income sources with editable amounts */}
                <div className="space-y-3 mb-6">
                  {recurringIncome.map(entry => (
                    <div key={entry.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <p className="flex-1 font-medium text-gray-900 text-sm">{entry.source}</p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          min="0"
                          value={amounts[entry.id]}
                          onChange={e =>
                            setAmounts(prev => ({
                              ...prev,
                              [entry.id]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="input pl-7 py-2 text-right text-sm font-medium w-28"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between py-3 border-t border-gray-100 mb-6">
                  <p className="font-medium text-gray-700">Total this month</p>
                  <p className="text-xl font-bold text-sprout-600">{formatCurrency(total)}</p>
                </div>

                <button
                  onClick={handleLog}
                  disabled={loading || total === 0}
                  className="btn-primary w-full"
                >
                  {loading ? 'Logging...' : 'Log my income →'}
                </button>
              </div>
            ) : (
              <div className="p-8 text-center relative overflow-hidden min-h-[320px] flex flex-col items-center justify-center">
                {/* Floating celebration emojis */}
                {CELEBRATION.map((emoji, i) => (
                  <span
                    key={i}
                    className="absolute text-2xl pointer-events-none select-none"
                    style={{
                      left: `${10 + i * 18}%`,
                      bottom: '30%',
                      animation: `paydayFloat 1.4s ease-out ${i * 0.12}s both`,
                    }}
                  >
                    {emoji}
                  </span>
                ))}

                <div className="text-6xl mb-4 animate-bloom">💰</div>
                <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
                  Income logged!
                </h2>
                <p className="text-gray-500 text-sm mb-1">{monthLabel}</p>
                <p className="text-2xl font-bold text-sprout-600 mb-5">
                  {formatCurrency(total)}
                </p>

                <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-4 py-2 text-sm font-semibold mb-8">
                  ⚡ +25 XP earned
                </div>

                <div className="flex gap-3 w-full">
                  <button onClick={handleClose} className="flex-1 btn-secondary">
                    Done
                  </button>
                  <a href="/budget" className="flex-1 btn-primary text-center" onClick={handleClose}>
                    Set budget →
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes paydayFloat {
          0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(-130px) rotate(25deg) scale(0.4); opacity: 0; }
        }
      `}</style>
    </>
  )
}
