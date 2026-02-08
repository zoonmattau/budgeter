'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Trash2, CheckCircle2, CreditCard, RefreshCw, Landmark, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { CategoryChip } from '@/components/ui/category-chip'
import { CurrencyInput } from '@/components/ui/currency-input'
import { DatePicker } from '@/components/ui/date-picker'
import { CreateCategoryModal } from '@/components/categories/create-category-modal'
import { formatCurrency } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'

type TransactionWithCategory = Tables<'transactions'> & {
  categories: Tables<'categories'> | null
  accounts?: { name: string } | Tables<'accounts'> | null
}

type BillWithPayments = Tables<'bills'> & {
  categories: Tables<'categories'> | null
  paymentHistory?: Array<{
    id: string
    date: string
    amount: number
  }>
}

interface TransactionEditModalProps {
  transaction: TransactionWithCategory
  categories: Tables<'categories'>[]
  creditCards?: Tables<'accounts'>[]
  bankAccounts?: Tables<'accounts'>[]
  onClose: () => void
}

export function TransactionEditModal({
  transaction,
  categories,
  creditCards = [],
  bankAccounts = [],
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
  const [selectedCardId, setSelectedCardId] = useState<string | null>(transaction.account_id)
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [localCategories, setLocalCategories] = useState(categories)

  // Bill related state
  const [linkedBill, setLinkedBill] = useState<BillWithPayments | null>(null)
  const [loadingBill, setLoadingBill] = useState(false)

  const isIncome = transaction.type === 'income'
  const isRecurring = transaction.is_recurring

  // Fetch linked bill and payment history
  useEffect(() => {
    async function fetchBillData() {
      if (!isRecurring && !transaction.bill_id) return

      setLoadingBill(true)

      // Try to find a matching bill by description/amount or bill_id
      let billQuery = supabase
        .from('bills')
        .select('*, categories(*)')

      if (transaction.bill_id) {
        billQuery = billQuery.eq('id', transaction.bill_id)
      } else {
        // Match by description and approximate amount
        billQuery = billQuery
          .eq('user_id', transaction.user_id)
          .ilike('name', transaction.description || '')
      }

      const { data: bills } = await billQuery.limit(1)

      if (bills && bills.length > 0) {
        const bill = bills[0] as BillWithPayments

        // Fetch payment history - transactions that match this bill
        const { data: payments } = await supabase
          .from('transactions')
          .select('id, date, amount')
          .eq('user_id', transaction.user_id)
          .or(`bill_id.eq.${bill.id},and(description.ilike.${bill.name},is_recurring.eq.true)`)
          .order('date', { ascending: false })
          .limit(10)

        bill.paymentHistory = payments || []
        setLinkedBill(bill)
      }

      setLoadingBill(false)
    }

    fetchBillData()
  }, [transaction, isRecurring, supabase])

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
        account_id: selectedCardId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id)

    // Update account balances if account changed
    if (!error && selectedCardId !== transaction.account_id) {
      // Revert old account balance
      if (transaction.account_id) {
        const oldCard = creditCards.find(c => c.id === transaction.account_id)
        const oldBank = bankAccounts.find(a => a.id === transaction.account_id)
        if (oldCard) {
          // Undo credit card: expense added balance, so subtract to revert
          // Income on credit card is not typical, but handle gracefully
          const revert = isIncome ? transaction.amount : -transaction.amount
          await supabase
            .from('accounts')
            .update({
              balance: oldCard.balance + revert,
              updated_at: new Date().toISOString(),
            })
            .eq('id', transaction.account_id)
        } else if (oldBank) {
          // Undo bank account: expense subtracted, income added
          const revert = isIncome ? -transaction.amount : transaction.amount
          await supabase
            .from('accounts')
            .update({
              balance: oldBank.balance + revert,
              updated_at: new Date().toISOString(),
            })
            .eq('id', transaction.account_id)
        }
      }
      // Apply to new account
      if (selectedCardId) {
        const newCard = creditCards.find(c => c.id === selectedCardId)
        const newBank = bankAccounts.find(a => a.id === selectedCardId)
        if (newCard) {
          // Credit card: expense increases balance
          await supabase
            .from('accounts')
            .update({
              balance: newCard.balance + parseFloat(amount),
              updated_at: new Date().toISOString(),
            })
            .eq('id', selectedCardId)
        } else if (newBank) {
          // Bank account: expense decreases, income increases
          const change = isIncome ? parseFloat(amount) : -parseFloat(amount)
          await supabase
            .from('accounts')
            .update({
              balance: newBank.balance + change,
              updated_at: new Date().toISOString(),
            })
            .eq('id', selectedCardId)
        }
      }
    }

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

    // Revert account balance on delete
    if (transaction.account_id) {
      const card = creditCards.find(c => c.id === transaction.account_id)
      const bank = bankAccounts.find(a => a.id === transaction.account_id)
      if (card) {
        // Credit card expense: balance was increased, so decrease to revert
        await supabase
          .from('accounts')
          .update({
            balance: card.balance - transaction.amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', transaction.account_id)
      } else if (bank) {
        // Bank account: expense decreased balance (revert by adding), income increased balance (revert by subtracting)
        const revert = isIncome ? -transaction.amount : transaction.amount
        await supabase
          .from('accounts')
          .update({
            balance: bank.balance + revert,
            updated_at: new Date().toISOString(),
          })
          .eq('id', transaction.account_id)
      }
    }

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
    selectedCategory?.id !== transaction.category_id ||
    selectedCardId !== transaction.account_id

  const currentCard = creditCards.find(c => c.id === selectedCardId)

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
            Edit {isIncome ? 'Income' : isRecurring ? 'Recurring Payment' : 'Expense'}
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
            <p className="text-gray-500 text-sm mb-4">
              This will permanently delete this {isIncome ? 'income' : 'expense'} record. This action cannot be undone.
            </p>
            {(isRecurring || linkedBill) && (
              <div className="p-3 bg-amber-50 rounded-xl mb-4">
                <p className="text-amber-700 text-sm">
                  <strong>Note:</strong> This only deletes this single transaction. Your recurring bill &quot;{linkedBill?.name || 'subscription'}&quot; will remain active and continue to generate future payments.
                </p>
              </div>
            )}
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
            {/* Linked Bill Info */}
            {(isRecurring || linkedBill) && (
              <div className="p-4 bg-bloom-50 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-bloom-700">
                  <RefreshCw className="w-4 h-4" />
                  <span className="font-medium text-sm">Recurring Payment</span>
                </div>

                {loadingBill ? (
                  <p className="text-sm text-bloom-600">Loading bill details...</p>
                ) : linkedBill ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Bill Name</span>
                      <span className="font-medium text-gray-900">{linkedBill.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Frequency</span>
                      <span className="text-sm text-gray-700 capitalize">{linkedBill.frequency}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Next Due</span>
                      <span className="text-sm text-gray-700">{format(new Date(linkedBill.next_due), 'MMM d, yyyy')}</span>
                    </div>

                    {/* Payment History */}
                    {linkedBill.paymentHistory && linkedBill.paymentHistory.length > 0 && (
                      <div className="pt-3 border-t border-bloom-200">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Payment History ({linkedBill.paymentHistory.length} payments)
                        </p>
                        <div className="space-y-1.5 max-h-24 overflow-y-auto">
                          {linkedBill.paymentHistory.slice(0, 5).map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">{format(new Date(payment.date), 'MMM d, yyyy')}</span>
                              <span className="text-gray-700">{formatCurrency(payment.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-bloom-600">No linked bill found</p>
                )}
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="label">Amount</label>
              <CurrencyInput value={amount} onChange={setAmount} placeholder="0" required />
            </div>

            {/* Category */}
            <div>
              <label className="label">Category</label>
              <div className="grid grid-cols-4 gap-2">
                {localCategories.map((cat) => (
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
                <button
                  type="button"
                  onClick={() => setShowCreateCategory(true)}
                  className="p-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all flex flex-col items-center justify-center gap-1"
                >
                  <div className="w-8 h-8 rounded-xl bg-gray-200 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">New</span>
                </button>
              </div>
            </div>

            {/* Payment Method - for expenses */}
            {!isIncome && (creditCards.length > 0 || bankAccounts.length > 0) && (
              <div>
                <label className="label">Payment Method</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCardId(null)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                      selectedCardId === null
                        ? 'bg-gray-200 text-gray-800'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-150'
                    }`}
                  >
                    Cash/Debit
                  </button>
                  {bankAccounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setSelectedCardId(account.id)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                        selectedCardId === account.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500 hover:bg-blue-50'
                      }`}
                    >
                      <Landmark className="w-3.5 h-3.5" />
                      {account.name}
                    </button>
                  ))}
                  {creditCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setSelectedCardId(card.id)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                        selectedCardId === card.id
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-500 hover:bg-purple-50'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      {card.name}
                    </button>
                  ))}
                </div>
                {currentCard && (
                  <p className="text-xs text-purple-600 mt-1.5">
                    Current balance: {formatCurrency(currentCard.balance)}
                  </p>
                )}
                {selectedCardId && bankAccounts.find(a => a.id === selectedCardId) && (
                  <p className="text-xs text-blue-600 mt-1.5">
                    Current balance: {formatCurrency(bankAccounts.find(a => a.id === selectedCardId)!.balance)}
                  </p>
                )}
              </div>
            )}

            {/* Deposit To - for income */}
            {isIncome && bankAccounts.length > 0 && (
              <div>
                <label className="label">Deposit to</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCardId(null)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                      selectedCardId === null
                        ? 'bg-gray-200 text-gray-800'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-150'
                    }`}
                  >
                    No account
                  </button>
                  {bankAccounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setSelectedCardId(account.id)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                        selectedCardId === account.id
                          ? 'bg-sprout-100 text-sprout-700'
                          : 'bg-gray-100 text-gray-500 hover:bg-sprout-50'
                      }`}
                    >
                      <Landmark className="w-3.5 h-3.5" />
                      {account.name}
                    </button>
                  ))}
                </div>
                {selectedCardId && bankAccounts.find(a => a.id === selectedCardId) && (
                  <p className="text-xs text-sprout-600 mt-1.5">
                    Current balance: {formatCurrency(bankAccounts.find(a => a.id === selectedCardId)!.balance)}
                  </p>
                )}
              </div>
            )}

            {/* Date */}
            <DatePicker label="Date" value={date} onChange={setDate} />

            {/* Description */}
            <div>
              <label className="label">Description</label>
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

      {showCreateCategory && (
        <CreateCategoryModal
          type={isIncome ? 'income' : 'expense'}
          onClose={() => setShowCreateCategory(false)}
          onCreated={(category) => {
            setLocalCategories(prev => [...prev, category])
            setSelectedCategory(category)
          }}
        />
      )}

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
