'use client'

import { useState } from 'react'
import { Pencil, X, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CurrencyInput } from '@/components/ui/currency-input'
import { formatCurrency } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'

// Time frame options with conversion to monthly
const TIME_FRAMES = [
  { id: 'week', label: 'Weekly', multiplier: 52 / 12 },
  { id: 'fortnight', label: 'Fortnightly', multiplier: 26 / 12 },
  { id: 'month', label: 'Monthly', multiplier: 1 },
  { id: 'year', label: 'Yearly', multiplier: 1 / 12 },
] as const

type TimeFrame = typeof TIME_FRAMES[number]['id']

interface IncomeEditorProps {
  incomeEntries: Tables<'income_entries'>[]
  currentMonth: string
  onUpdate: () => void
}

export function IncomeEditor({ incomeEntries, currentMonth, onUpdate }: IncomeEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [entries, setEntries] = useState(incomeEntries)
  const [newSource, setNewSource] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newTimeFrame, setNewTimeFrame] = useState<TimeFrame>('month')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()
  const totalIncome = entries.reduce((sum, e) => sum + Number(e.amount), 0)

  async function handleAddEntry() {
    if (!newSource || !newAmount) return

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Convert to monthly amount
    const timeFrame = TIME_FRAMES.find(t => t.id === newTimeFrame)
    const monthlyAmount = Math.round(parseFloat(newAmount) * (timeFrame?.multiplier || 1))

    const { data, error } = await supabase
      .from('income_entries')
      .insert({
        user_id: user.id,
        source: newSource,
        amount: monthlyAmount,
        month: currentMonth,
      })
      .select()
      .single()

    if (!error && data) {
      setEntries([...entries, data])
      setNewSource('')
      setNewAmount('')
      setNewTimeFrame('month')
      onUpdate()
    }

    setSaving(false)
  }

  async function handleDeleteEntry(id: string) {
    const { error } = await supabase
      .from('income_entries')
      .delete()
      .eq('id', id)

    if (!error) {
      setEntries(entries.filter(e => e.id !== id))
      onUpdate()
    }
  }

  async function handleUpdateEntry(id: string, amount: number) {
    const { error } = await supabase
      .from('income_entries')
      .update({ amount })
      .eq('id', id)

    if (!error) {
      setEntries(entries.map(e => e.id === id ? { ...e, amount } : e))
      onUpdate()
    }
  }

  if (!isOpen) {
    return (
      <div>
        <p className="text-sm text-gray-500">Monthly Income</p>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalIncome)}</p>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-bloom-600 bg-white rounded-lg hover:bg-bloom-50 transition-colors shadow-sm"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 pb-safe animate-slide-up sm:animate-none">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-semibold">Edit Income</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Existing entries */}
        <div className="space-y-3 mb-6">
          {entries.length === 0 ? (
            <p className="text-center text-gray-400 py-4">No income sources added</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{entry.source}</p>
                </div>
                <div className="w-28">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      value={entry.amount}
                      onChange={(e) => handleUpdateEntry(entry.id, parseFloat(e.target.value) || 0)}
                      className="input pl-7 py-2 text-right text-sm font-medium"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteEntry(entry.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add new entry */}
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Add Income Source</p>
          <div className="space-y-3">
            <input
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="e.g., Salary, Freelance, Side hustle"
              className="input"
            />

            {/* Time frame selector */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-full">
              {TIME_FRAMES.map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setNewTimeFrame(tf.id)}
                  className={`flex-1 px-2 py-1.5 rounded-full text-xs font-medium transition-all ${
                    newTimeFrame === tf.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <CurrencyInput
              value={newAmount}
              onChange={setNewAmount}
              placeholder="0"
            />
            <button
              onClick={handleAddEntry}
              disabled={saving || !newSource || !newAmount}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Adding...' : 'Add Income'}
            </button>
          </div>
        </div>

        {/* Total */}
        <div className="mt-6 pt-4 border-t flex justify-between items-center">
          <p className="font-medium text-gray-700">Total Monthly Income</p>
          <p className="text-xl font-bold text-bloom-600">{formatCurrency(totalIncome)}</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
