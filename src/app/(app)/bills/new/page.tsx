'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { addMonths, addWeeks, format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { CategoryChip } from '@/components/ui/category-chip'
import { CurrencyInput } from '@/components/ui/currency-input'
import type { Tables } from '@/lib/database.types'

const frequencies = [
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
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        // Default to Utilities or first category
        const utilities = data.find(c => c.name === 'Utilities')
        setCategoryId(utilities?.id || data[0]?.id || '')
      }
    }
    loadCategories()
  }, [supabase])

  function calculateNextDue(): string {
    const today = new Date()
    const parsedDay = parseInt(dueDay, 10)
    // Clamp day to valid range (1-31)
    const day = isNaN(parsedDay) ? 1 : Math.max(1, Math.min(31, parsedDay))

    let nextDue = new Date(today.getFullYear(), today.getMonth(), day)

    // If the day has passed this month/week, move to next period
    if (nextDue <= today) {
      switch (frequency) {
        case 'weekly':
          nextDue = addWeeks(nextDue, 1)
          break
        case 'fortnightly':
          nextDue = addWeeks(nextDue, 2)
          break
        case 'monthly':
          nextDue = addMonths(nextDue, 1)
          break
        case 'quarterly':
          nextDue = addMonths(nextDue, 3)
          break
        case 'yearly':
          nextDue = addMonths(nextDue, 12)
          break
      }
    }

    return format(nextDue, 'yyyy-MM-dd')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name || !amount || !categoryId) return

    // Validate due day
    const parsedDueDay = parseInt(dueDay, 10)
    if (isNaN(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31) {
      setError('Please enter a valid due day (1-31)')
      return
    }

    // Validate amount
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
      frequency: frequency as 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly',
      due_day: parsedDueDay,
      next_due: calculateNextDue(),
      category_id: categoryId,
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
        <h1 className="font-display text-2xl font-bold text-gray-900">Add Bill</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Bill Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Electricity"
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

        <div>
          <label className="label">Due Day</label>
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
            Day of the month the bill is due
          </p>
        </div>

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

        <button
          type="submit"
          disabled={loading || !name || !amount || !categoryId}
          className="btn-primary w-full"
        >
          {loading ? 'Adding...' : 'Add Bill'}
        </button>
      </form>
    </div>
  )
}
