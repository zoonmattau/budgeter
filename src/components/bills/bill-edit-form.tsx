'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2, Calendar, RotateCcw, CheckCircle2 } from 'lucide-react'
import { format, addMonths, addWeeks } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { CurrencyInput } from '@/components/ui/currency-input'
import { CategoryChip } from '@/components/ui/category-chip'
import { formatCurrency } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'

type BillWithCategory = Tables<'bills'> & {
  categories: Tables<'categories'> | null
}

interface BillEditFormProps {
  bill: BillWithCategory
}

type Frequency = 'once' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'

const frequencies: { value: Frequency; label: string }[] = [
  { value: 'once', label: 'One-off' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

export function BillEditForm({ bill }: BillEditFormProps) {
  const router = useRouter()
  const [categories, setCategories] = useState<Tables<'categories'>[]>([])
  const [name, setName] = useState(bill.name)
  const [amount, setAmount] = useState(String(bill.amount))
  const [frequency, setFrequency] = useState<Frequency>(bill.is_one_off ? 'once' : bill.frequency as Frequency)
  const [dueDay, setDueDay] = useState(String(bill.due_day))
  const [dueDate, setDueDate] = useState(bill.next_due)
  const isOneOff = frequency === 'once'
  const isWeeklyOrFortnightly = frequency === 'weekly' || frequency === 'fortnightly'
  const isQuarterlyOrYearly = frequency === 'quarterly' || frequency === 'yearly'
  const isMonthly = frequency === 'monthly'
  const [categoryId, setCategoryId] = useState(bill.category_id)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function loadCategories() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .order('sort_order')

      if (data) {
        setCategories(data)
      }
    }
    loadCategories()
  }, [supabase])

  function calculateNextDue(): string {
    // For one-off, quarterly, yearly, or weekly/fortnightly - use the date picker
    if (isOneOff || isQuarterlyOrYearly || isWeeklyOrFortnightly) {
      return dueDate
    }

    // Monthly - use day of month
    const today = new Date()
    const parsedDay = parseInt(dueDay, 10)
    const day = isNaN(parsedDay) ? 1 : Math.max(1, Math.min(31, parsedDay))
    let nextDue = new Date(today.getFullYear(), today.getMonth(), day)

    if (nextDue <= today) {
      nextDue = addMonths(nextDue, 1)
    }

    return format(nextDue, 'yyyy-MM-dd')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name || !amount || !categoryId) return

    // Validate based on frequency
    let parsedDueDay = 1

    if (isMonthly) {
      parsedDueDay = parseInt(dueDay, 10)
      if (isNaN(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31) {
        setError('Please enter a valid due day (1-31)')
        return
      }
    } else if (isWeeklyOrFortnightly) {
      // Store day of week (0-6) from the selected date
      parsedDueDay = new Date(dueDate).getDay()
    } else if (isQuarterlyOrYearly || isOneOff) {
      // Store day of month from the selected date
      parsedDueDay = new Date(dueDate).getDate()
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setLoading(true)

    const updateData = {
      name,
      amount: parsedAmount,
      frequency: isOneOff ? 'monthly' : frequency as 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly',
      due_day: parsedDueDay,
      next_due: calculateNextDue(),
      category_id: categoryId,
      is_one_off: isOneOff,
    }

    const { error: updateError } = await supabase
      .from('bills')
      .update(updateData)
      .eq('id', bill.id)

    if (updateError) {
      setError(`Failed to update bill: ${updateError.message || updateError.code || JSON.stringify(updateError)}`)
      console.error('Error updating bill:', JSON.stringify(updateError, null, 2))
      setLoading(false)
      return
    }

    setShowSuccess(true)
    setLoading(false)
    setTimeout(() => {
      router.push('/bills')
      router.refresh()
    }, 1000)
  }

  async function handleMarkPaid() {
    setLoading(true)

    // Calculate the next due date based on frequency
    const currentDue = new Date(bill.next_due)
    let nextDue: Date

    switch (frequency) {
      case 'weekly':
        nextDue = addWeeks(currentDue, 1)
        break
      case 'fortnightly':
        nextDue = addWeeks(currentDue, 2)
        break
      case 'monthly':
        nextDue = addMonths(currentDue, 1)
        break
      case 'quarterly':
        nextDue = addMonths(currentDue, 3)
        break
      case 'yearly':
        nextDue = addMonths(currentDue, 12)
        break
      default:
        nextDue = addMonths(currentDue, 1)
    }

    const { error: updateError } = await supabase
      .from('bills')
      .update({
        next_due: format(nextDue, 'yyyy-MM-dd'),
        saved_amount: 0,
      })
      .eq('id', bill.id)

    if (!updateError) {
      router.refresh()
    }

    setLoading(false)
  }

  async function handleDeactivate() {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${bill.name}"? The bill will be hidden from your list.`
    )

    if (!confirmed) return

    setDeleting(true)

    const { error: updateError } = await supabase
      .from('bills')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bill.id)

    if (!updateError) {
      router.push('/bills')
      router.refresh()
    }

    setDeleting(false)
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${bill.name}"? This action cannot be undone.`
    )

    if (!confirmed) return

    setDeleting(true)

    const { error: deleteError } = await supabase
      .from('bills')
      .delete()
      .eq('id', bill.id)

    if (!deleteError) {
      router.push('/bills')
      router.refresh()
    }

    setDeleting(false)
  }

  const displayDueDate = new Date(bill.next_due)
  const isOverdue = displayDueDate < new Date() && displayDueDate.toDateString() !== new Date().toDateString()

  return (
    <>
      <div className="flex items-center gap-3">
        <Link href="/bills" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <h1 className="font-display text-2xl font-bold text-gray-900">Edit Bill</h1>
      </div>

      {/* Bill Summary Card */}
      <div className={`card ${isOverdue ? 'bg-gradient-to-br from-red-50 to-coral-50' : 'bg-gradient-to-br from-amber-50 to-bloom-50'}`}>
        <div className="flex items-center gap-4">
          {bill.categories && (
            <CategoryChip
              name={bill.categories.name}
              color={bill.categories.color}
              icon={bill.categories.icon}
              size="md"
            />
          )}
          <div className="flex-1">
            <h2 className="font-display text-lg font-semibold text-gray-900">{bill.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(bill.amount)}</span>
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <RotateCcw className="w-3 h-3" />
                {frequencies.find(f => f.value === bill.frequency)?.label}
              </span>
            </div>
            <p className={`text-sm mt-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              <Calendar className="w-3 h-3 inline mr-1" />
              {isOverdue ? 'Overdue - ' : 'Next due: '}
              {format(displayDueDate, 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 pt-4 border-t border-white/30">
          <button
            onClick={handleMarkPaid}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-sprout-500 text-white hover:bg-sprout-600 rounded-xl transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading ? 'Updating...' : 'Mark as Paid'}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            This will move the due date to the next billing cycle
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="bill-name" className="label">Bill Name</label>
          <input
            id="bill-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Electricity"
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="bill-amount" className="label">Amount</label>
          <CurrencyInput
            id="bill-amount"
            value={amount}
            onChange={setAmount}
            placeholder="150"
            required
          />
        </div>

        <div>
          <label className="label">Frequency</label>
          <div className="grid grid-cols-3 gap-2">
            {frequencies.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFrequency(f.value)}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  frequency === f.value
                    ? 'border-bloom-500 bg-bloom-50 text-bloom-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* One-off: Calendar picker */}
        {isOneOff && (
          <div>
            <label htmlFor="due-date" className="label">Due Date</label>
            <input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              When is this one-off payment due?
            </p>
          </div>
        )}

        {/* Weekly/Fortnightly: Date picker for next due date */}
        {isWeeklyOrFortnightly && (
          <div>
            <label htmlFor="due-date-weekly" className="label">Next Due Date</label>
            <input
              id="due-date-weekly"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              {frequency === 'weekly'
                ? 'Select the next due date - we\'ll repeat every week'
                : 'Select the next due date - we\'ll repeat every 2 weeks'}
            </p>
          </div>
        )}

        {/* Monthly: Day of month */}
        {isMonthly && (
          <div>
            <label htmlFor="due-day" className="label">Due Day of Month</label>
            <input
              id="due-day"
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              className="input"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Day of the month the bill is due (1-31)
            </p>
          </div>
        )}

        {/* Quarterly/Yearly: Calendar picker for next occurrence */}
        {isQuarterlyOrYearly && (
          <div>
            <label htmlFor="due-date" className="label">Next Due Date</label>
            <input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              {frequency === 'quarterly'
                ? 'Select the next due date - we\'ll repeat every 3 months'
                : 'Select the next due date - we\'ll repeat every year'}
            </p>
          </div>
        )}

        <div>
          <label className="label">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {categories.slice(0, 8).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  categoryId === cat.id
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

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        {showSuccess && (
          <div className="p-3 bg-sprout-50 text-sprout-700 rounded-xl text-sm text-center font-medium">
            Bill updated successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name || !amount || !categoryId}
          className="btn-primary w-full"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Danger Zone */}
      <div className="pt-4 border-t border-gray-100 space-y-2">
        <button
          type="button"
          onClick={handleDeactivate}
          disabled={deleting}
          className="w-full py-3 px-4 rounded-xl text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
        >
          {deleting ? 'Processing...' : 'Deactivate Bill'}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="w-full py-3 px-4 rounded-xl text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? 'Deleting...' : 'Delete Permanently'}
        </button>
      </div>
    </>
  )
}
