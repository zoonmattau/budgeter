'use client'

import { useState } from 'react'
import { X, Calendar, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday } from 'date-fns'

type PayFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

interface PayScheduleModalProps {
  incomeId: string
  source: string
  currentFrequency?: PayFrequency | null
  currentPayDay?: number | null
  currentNextPayDate?: string | null
  onClose: () => void
  onSave: () => void
}

function getNextDayOfWeek(dayOfWeek: number): Date {
  const today = new Date()
  const fns = [nextSunday, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday]
  const nextDate = fns[dayOfWeek](today)
  // If today is the day, use today
  if (today.getDay() === dayOfWeek) {
    return today
  }
  return nextDate
}

export function PayScheduleModal({
  incomeId,
  source,
  currentFrequency,
  currentPayDay,
  currentNextPayDate,
  onClose,
  onSave,
}: PayScheduleModalProps) {
  const [frequency, setFrequency] = useState<PayFrequency>(currentFrequency || 'fortnightly')
  const [payDay, setPayDay] = useState<number>(currentPayDay ?? 1)
  const [nextPayDate, setNextPayDate] = useState<string>(
    currentNextPayDate || format(new Date(), 'yyyy-MM-dd')
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const isWeekly = frequency === 'weekly' || frequency === 'fortnightly'
  const usesMonthDay = frequency === 'monthly' || frequency === 'quarterly' || frequency === 'yearly'

  async function handleSave() {
    setSaving(true)
    setError(null)

    const { error: saveError } = await supabase
      .from('income_entries')
      .update({
        pay_frequency: frequency,
        pay_day: payDay,
        next_pay_date: nextPayDate,
      })
      .eq('id', incomeId)

    if (saveError) {
      console.error('Failed to save pay schedule:', saveError)
      setError(saveError.message || 'Failed to save. Please try again.')
      setSaving(false)
      return
    }

    onSave()
    onClose()
  }

  function handleFrequencyChange(newFrequency: PayFrequency) {
    setFrequency(newFrequency)
    // Reset pay day to appropriate default
    if (newFrequency === 'weekly' || newFrequency === 'fortnightly') {
      setPayDay(4) // Thursday
    } else {
      setPayDay(15) // 15th of month
    }
  }


  function handlePayDayChange(newPayDay: number) {
    setPayDay(newPayDay)
    // Auto-calculate next pay date
    if (!usesMonthDay) {
      const next = getNextDayOfWeek(newPayDay)
      setNextPayDate(format(next, 'yyyy-MM-dd'))
    } else {
      const today = new Date()
      let nextDate = new Date(today.getFullYear(), today.getMonth(), newPayDay)
      if (nextDate <= today) {
        if (frequency === 'quarterly') {
          nextDate = new Date(today.getFullYear(), today.getMonth() + 3, newPayDay)
        } else if (frequency === 'yearly') {
          nextDate = new Date(today.getFullYear() + 1, today.getMonth(), newPayDay)
        } else {
          nextDate = new Date(today.getFullYear(), today.getMonth() + 1, newPayDay)
        }
      }
      setNextPayDate(format(nextDate, 'yyyy-MM-dd'))
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 pb-safe animate-slide-up sm:animate-none">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-xl font-semibold">Pay Schedule</h2>
            <p className="text-sm text-gray-500">{source}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Frequency selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How often do you get paid?
            </label>
            <div className="flex gap-2 flex-wrap">
              {(['weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly'] as PayFrequency[]).map((f) => (
                <button
                  key={f}
                  onClick={() => handleFrequencyChange(f)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                    frequency === f
                      ? 'bg-bloom-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Pay day selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isWeekly ? 'Which day do you get paid?' : 'What day of the month?'}
            </label>
            {!usesMonthDay ? (
              <div className="grid grid-cols-4 gap-2">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => handlePayDayChange(day.value)}
                    className={`py-2 px-2 rounded-xl text-sm font-medium transition-all ${
                      payDay === day.value
                        ? 'bg-bloom-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day.label.slice(0, 3)}
                  </button>
                ))}
              </div>
            ) : (
              <select
                value={payDay}
                onChange={(e) => handlePayDayChange(parseInt(e.target.value))}
                className="input"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                    {day === 1 || day === 21 || day === 31
                      ? 'st'
                      : day === 2 || day === 22
                      ? 'nd'
                      : day === 3 || day === 23
                      ? 'rd'
                      : 'th'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Next pay date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Next pay date
            </label>
            <input
              type="date"
              value={nextPayDate}
              onChange={(e) => setNextPayDate(e.target.value)}
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              This helps us accurately project your cash flow
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
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
