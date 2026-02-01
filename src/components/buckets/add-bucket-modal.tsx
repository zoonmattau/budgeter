'use client'

import { useState } from 'react'
import { X, CircleDot, ShoppingBag, Coffee, Car, Home, Heart, Zap, PiggyBank, Target, Wallet, CreditCard, Landmark } from 'lucide-react'
import { CurrencyInput } from '@/components/ui/currency-input'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth } from 'date-fns'

type BucketType = 'budget' | 'savings' | 'accounts'

interface AddBucketModalProps {
  type: BucketType
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// Icon options for custom buckets
const ICON_OPTIONS = [
  { id: 'circle-dot', icon: CircleDot },
  { id: 'shopping-bag', icon: ShoppingBag },
  { id: 'coffee', icon: Coffee },
  { id: 'car', icon: Car },
  { id: 'home', icon: Home },
  { id: 'heart', icon: Heart },
  { id: 'zap', icon: Zap },
  { id: 'piggy-bank', icon: PiggyBank },
  { id: 'target', icon: Target },
  { id: 'wallet', icon: Wallet },
  { id: 'credit-card', icon: CreditCard },
  { id: 'landmark', icon: Landmark },
]

// Color options
const COLOR_OPTIONS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
]

export function AddBucketModal({ type, isOpen, onClose, onSuccess }: AddBucketModalProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('circle-dot')
  const [selectedColor, setSelectedColor] = useState('#3b82f6')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  function resetForm() {
    setName('')
    setAmount('')
    setSelectedIcon('circle-dot')
    setSelectedColor('#3b82f6')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !amount) return

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')

      if (type === 'budget') {
        // Create category first
        const { data: category, error: catError } = await supabase
          .from('categories')
          .insert({
            user_id: user.id,
            name: name.trim(),
            icon: selectedIcon,
            color: selectedColor,
            type: 'expense',
            is_system: false,
            sort_order: 100,
          })
          .select()
          .single()

        if (catError) {
          console.error('Error creating category:', catError)
          setLoading(false)
          return
        }

        // Create budget allocation
        const { error: budgetError } = await supabase.from('budgets').insert({
          user_id: user.id,
          category_id: category.id,
          month: currentMonth,
          allocated: parseFloat(amount),
        })

        if (budgetError) {
          console.error('Error creating budget:', budgetError)
        }
      } else if (type === 'savings') {
        // Create a goal
        const { error } = await supabase.from('goals').insert({
          user_id: user.id,
          name: name.trim(),
          target_amount: parseFloat(amount),
          current_amount: 0,
          icon: selectedIcon,
          color: selectedColor,
          visual_type: 'plant',
          status: 'active',
        })

        if (error) {
          console.error('Error creating goal:', error)
        }
      } else if (type === 'accounts') {
        // Create an account
        const { error } = await supabase.from('accounts').insert({
          user_id: user.id,
          name: name.trim(),
          type: 'cash',
          balance: parseFloat(amount),
          is_asset: true,
        })

        if (error) {
          console.error('Error creating account:', error)
        }
      }

      resetForm()
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating bucket:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const titles = {
    budget: 'Add Budget Category',
    savings: 'Add Savings Goal',
    accounts: 'Add Account',
  }

  const amountLabels = {
    budget: 'Monthly Budget',
    savings: 'Target Amount',
    accounts: 'Current Balance',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 pb-safe animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-semibold text-gray-900">
            {titles[type]}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'budget' ? 'e.g., Pet Supplies' : type === 'savings' ? 'e.g., New Car' : 'e.g., Savings Account'}
              className="input"
              autoFocus
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="label">{amountLabels[type]}</label>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              placeholder="0"
              required
            />
          </div>

          {/* Icon selection */}
          {(type === 'budget' || type === 'savings') && (
            <div>
              <label className="label">Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {ICON_OPTIONS.map(({ id, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedIcon(id)}
                    className={`p-3 rounded-xl transition-all ${
                      selectedIcon === id
                        ? 'bg-bloom-100 ring-2 ring-bloom-500'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-5 h-5 mx-auto" style={{ color: selectedColor }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color selection */}
          {(type === 'budget' || type === 'savings') && (
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
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !name.trim() || !amount}
            className="btn-primary w-full"
          >
            {loading ? 'Creating...' : 'Create Bucket'}
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
