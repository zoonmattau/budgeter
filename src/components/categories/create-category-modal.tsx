'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CategoryChip } from '@/components/ui/category-chip'
import type { Tables } from '@/lib/database.types'

const ICON_OPTIONS = [
  'circle-dot', 'shopping-bag', 'shopping-cart', 'coffee', 'car', 'home',
  'heart', 'zap', 'piggy-bank', 'target', 'wallet', 'credit-card',
  'landmark', 'utensils', 'plane', 'gift', 'music', 'book',
  'gamepad-2', 'shirt', 'dog', 'baby', 'briefcase', 'wrench',
]

const COLOR_OPTIONS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899',
]

interface CreateCategoryModalProps {
  type: 'expense' | 'income'
  onClose: () => void
  onCreated: (category: Tables<'categories'>) => void
}

export function CreateCategoryModal({ type, onClose, onCreated }: CreateCategoryModalProps) {
  const [name, setName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('circle-dot')
  const [selectedColor, setSelectedColor] = useState('#3b82f6')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const { data: category, error: saveError } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: name.trim(),
        icon: selectedIcon,
        color: selectedColor,
        type,
        is_system: false,
        sort_order: 100,
      })
      .select()
      .single()

    if (saveError) {
      if (saveError.message?.includes('duplicate') || saveError.code === '23505') {
        setError('A category with that name already exists')
      } else {
        setError(saveError.message || 'Failed to create category')
      }
      setLoading(false)
      return
    }

    onCreated(category)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 pb-safe animate-slide-up sm:animate-none">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-semibold text-gray-900">
            New {type === 'income' ? 'Income' : 'Expense'} Category
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Preview */}
          <div className="flex items-center justify-center py-3">
            <CategoryChip
              name={name || 'Category'}
              color={selectedColor}
              icon={selectedIcon}
              showLabel
            />
          </div>

          {/* Name */}
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Pet Supplies"
              className="input"
              autoFocus
              required
            />
          </div>

          {/* Icon */}
          <div>
            <label className="label">Icon</label>
            <div className="grid grid-cols-8 gap-1.5 max-h-32 overflow-y-auto">
              {ICON_OPTIONS.map((iconId) => (
                <button
                  key={iconId}
                  type="button"
                  onClick={() => setSelectedIcon(iconId)}
                  className={`p-2.5 rounded-xl transition-all ${
                    selectedIcon === iconId
                      ? 'bg-bloom-100 ring-2 ring-bloom-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <CategoryChip
                    name=""
                    color={selectedColor}
                    icon={iconId}
                    size="sm"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    selectedColor === color
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn-primary w-full"
          >
            {loading ? 'Creating...' : 'Create Category'}
          </button>
        </form>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  )
}
