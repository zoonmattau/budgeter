'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { addMonths, format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { CategoryChip } from '@/components/ui/category-chip'
import { CurrencyInput } from '@/components/ui/currency-input'
import { CreateCategoryModal } from '@/components/categories/create-category-modal'
import type { Tables } from '@/lib/database.types'

const frequencies = [
  { value: 'once', label: 'One-off' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

export default function NewBillPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Tables<'categories'>[]>([])
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [dueDay, setDueDay] = useState(new Date().getDate().toString())
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateCategory, setShowCreateCategory] = useState(false)

  const supabase = createClient()

  const isWeeklyOrFortnightly = frequency === 'weekly' || frequency === 'fortnightly'
  const isQuarterlyOrYearly = frequency === 'quarterly' || frequency === 'yearly'
  const isMonthly = frequency === 'monthly'
  const isOneOff = frequency === 'once'

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
        const utilities = data.find(c => c.name === 'Utilities')
        setCategoryId(utilities?.id || data[0]?.id || '')
      }
    }
    loadCategories()
  }, [supabase])

  function calculateNextDue(): string {
    const today = new Date()

    if (isOneOff || isQuarterlyOrYearly || isWeeklyOrFortnightly) {
      return dueDate
    }

    // Monthly
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
      // Store day of week (0-6) from selected date
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in to add a bill')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('bills').insert({
      user_id: user.id,
      name,
      amount: parsedAmount,
      frequency: isOneOff ? 'monthly' : frequency as 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly',
      due_day: parsedDueDay,
      next_due: calculateNextDue(),
      category_id: categoryId,
      is_one_off: isOneOff,
    })

    if (insertError) {
      setError('Failed to add bill. Please try again.')
      console.error('Error adding bill:', insertError)
      setLoading(false)
      return
    }

    router.push('/bills')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/bills" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Add Bill
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Bill Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Netflix, Electricity"
            className="input"
            required
          />
        </div>

        <div>
          <label className="label">Amount</label>
          <CurrencyInput
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
            <label className="label">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="input"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              When is this payment due?
            </p>
          </div>
        )}

        {/* Weekly/Fortnightly: Date picker for next due date */}
        {isWeeklyOrFortnightly && (
          <div>
            <label className="label">First Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              {frequency === 'weekly'
                ? 'Select the first due date - we\'ll repeat every week'
                : 'Select the first due date - we\'ll repeat every 2 weeks'}
            </p>
          </div>
        )}

        {/* Monthly: Day of month */}
        {isMonthly && (
          <div>
            <label className="label">Due Day of Month</label>
            <input
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

        {/* Quarterly/Yearly: Calendar picker for first occurrence */}
        {isQuarterlyOrYearly && (
          <div>
            <label className="label">First Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="input"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              {frequency === 'quarterly'
                ? 'Select the first due date - we\'ll repeat every 3 months'
                : 'Select the first due date - we\'ll repeat every year'}
            </p>
          </div>
        )}

        <div>
          <label className="label">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {categories.slice(0, 11).map((cat) => (
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
            <button
              type="button"
              onClick={() => setShowCreateCategory(true)}
              className="p-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all flex flex-col items-center justify-center gap-1"
            >
              <Plus className="w-5 h-5 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">New</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name || !amount || !categoryId}
          className="btn-primary w-full"
        >
          {loading ? 'Adding...' : 'Add Bill'}
        </button>
      </form>

      {showCreateCategory && (
        <CreateCategoryModal
          type="expense"
          onClose={() => setShowCreateCategory(false)}
          onCreated={(newCat) => {
            setCategories(prev => [...prev, newCat])
            setCategoryId(newCat.id)
            setShowCreateCategory(false)
          }}
        />
      )}
    </div>
  )
}
