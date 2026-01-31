'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CategoryChip } from '@/components/ui/category-chip'
import type { Tables } from '@/lib/database.types'

interface QuickAddButtonProps {
  categories: Tables<'categories'>[]
}

export function QuickAddButton({ categories }: QuickAddButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Tables<'categories'> | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCategory || !amount) return

    setLoading(true)

    const { error } = await supabase.from('transactions').insert({
      user_id: (await supabase.auth.getUser()).data.user!.id,
      category_id: selectedCategory.id,
      amount: parseFloat(amount),
      type: 'expense',
      description: description || selectedCategory.name,
      date: new Date().toISOString().split('T')[0],
    })

    if (!error) {
      setIsOpen(false)
      setSelectedCategory(null)
      setAmount('')
      setDescription('')
      // Trigger refresh
      window.location.reload()
    }

    setLoading(false)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-bloom-500 to-bloom-600 text-white shadow-lg shadow-bloom-500/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 pb-safe animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-semibold">Add Expense</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Amount */}
          <div>
            <label className="label">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="input pl-8 text-2xl font-semibold currency-input"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="label">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {categories.slice(0, 8).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    selectedCategory?.id === cat.id
                      ? 'border-bloom-500 bg-bloom-50'
                      : 'border-transparent bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <CategoryChip
                    name={cat.name}
                    color={cat.color}
                    icon={cat.icon}
                    size="sm"
                    showLabel
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this for?"
              className="input"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !selectedCategory || !amount}
            className="btn-primary w-full"
          >
            {loading ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
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
