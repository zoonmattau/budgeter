'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Trash2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CategoryChip } from '@/components/ui/category-chip'
import { CurrencyInput } from '@/components/ui/currency-input'
import { DatePicker } from '@/components/ui/date-picker'
import type { Tables } from '@/lib/database.types'

type TransactionWithCategory = Tables<'transactions'> & {
  categories: Tables<'categories'> | null
}

interface TransactionEditModalProps {
  transaction: TransactionWithCategory
  categories: Tables<'categories'>[]
  onClose: () => void
}

export function TransactionEditModal({
  transaction,
  categories,
  onClose,
}: TransactionEditModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [amount, setAmount] = useState(String(transaction.amount))
  const [description, setDescription] = useState(transaction.description || '')
  const [date, setDate] = useState(transaction.date)
  const [selectedCategory, setSelectedCategory] = useState<Tables<'categories'> | null>(
    transaction.categories
  )
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isIncome = transaction.type === 'income'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || !selectedCategory) return

    setLoading(true)

    const { error } = await supabase
      .from('transactions')
      .update({
        amount: parseFloat(amount),
        description,
        date,
        category_id: selectedCategory.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id)

    if (!error) {
      setShowSuccess(true)
      setTimeout(() => {
        onClose()
        router.refresh()
      }, 1000)
    }

    setLoading(false)
  }

  async function handleDelete() {
    setDeleting(true)

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transaction.id)

    if (!error) {
      onClose()
      router.refresh()
    }

    setDeleting(false)
  }

  const hasChanges =
    parseFloat(amount) !== transaction.amount ||
    description !== (transaction.description || '') ||
    date !== transaction.date ||
    selectedCategory?.id !== transaction.category_id

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-transaction-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="edit-transaction-title"
            className={`font-display text-xl font-semibold ${
              isIncome ? 'text-sprout-700' : 'text-gray-900'
            }`}
          >
            Edit {isIncome ? 'Income' : 'Expense'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Success State */}
        {showSuccess ? (
          <div className="py-12 text-center">
            <div
              className={`w-16 h-16 rounded-full ${
                isIncome ? 'bg-sprout-100' : 'bg-bloom-100'
              } flex items-center justify-center mx-auto mb-4`}
            >
              <CheckCircle2
                className={`w-8 h-8 ${isIncome ? 'text-sprout-600' : 'text-bloom-600'}`}
              />
            </div>
            <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
              Changes Saved!
            </h3>
            <p className="text-gray-500 text-sm">Your transaction has been updated.</p>
          </div>
        ) : showDeleteConfirm ? (
          /* Delete Confirmation */
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
              Delete Transaction?
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              This will permanently delete this {isIncome ? 'income' : 'expense'}. This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          /* Edit Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Amount */}
            <div>
              <label className="label">Amount</label>
              <CurrencyInput value={amount} onChange={setAmount} placeholder="0" required />
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
                        ? isIncome
                          ? 'border-sprout-500 bg-sprout-50'
                          : 'border-bloom-500 bg-bloom-50'
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
              {categories.length > 8 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {categories.slice(8).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        selectedCategory?.id === cat.id
                          ? isIncome
                            ? 'border-sprout-500 bg-sprout-50'
                            : 'border-bloom-500 bg-bloom-50'
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
              )}
            </div>

            {/* Date */}
            <DatePicker label="Date" value={date} onChange={setDate} />

            {/* Description */}
            <div>
              <label className="label">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isIncome ? 'e.g., Tax refund' : 'What was this for?'}
                className="input"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !amount || !selectedCategory || !hasChanges}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isIncome
                  ? 'bg-gradient-to-r from-sprout-500 to-sprout-600 text-white shadow-lg shadow-sprout-500/30 hover:shadow-sprout-500/40'
                  : 'bg-gradient-to-r from-bloom-500 to-bloom-600 text-white shadow-lg shadow-bloom-500/30 hover:shadow-bloom-500/40'
              }`}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3 px-4 rounded-xl text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Transaction
              </button>
            </div>
          </form>
        )}
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
