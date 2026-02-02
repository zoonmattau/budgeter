'use client'

import { format, subDays, addDays } from 'date-fns'

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  label?: string
  allowFuture?: boolean
}

export function DatePicker({ value, onChange, label, allowFuture = false }: DatePickerProps) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd')
  const nextMonth = format(addDays(new Date(), 30), 'yyyy-MM-dd')

  return (
    <div>
      {label && <label className="label">{label}</label>}

      {/* Quick shortcuts */}
      <div className="flex gap-2 mb-2 flex-wrap">
        <button
          type="button"
          onClick={() => onChange(today)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            value === today
              ? 'bg-bloom-100 text-bloom-700 border border-bloom-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
          }`}
        >
          Today
        </button>
        {!allowFuture && (
          <button
            type="button"
            onClick={() => onChange(yesterday)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              value === yesterday
                ? 'bg-bloom-100 text-bloom-700 border border-bloom-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
            }`}
          >
            Yesterday
          </button>
        )}
        {allowFuture && (
          <>
            <button
              type="button"
              onClick={() => onChange(nextWeek)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                value === nextWeek
                  ? 'bg-bloom-100 text-bloom-700 border border-bloom-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
              }`}
            >
              Next Week
            </button>
            <button
              type="button"
              onClick={() => onChange(nextMonth)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                value === nextMonth
                  ? 'bg-bloom-100 text-bloom-700 border border-bloom-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
              }`}
            >
              Next Month
            </button>
          </>
        )}
      </div>

      {/* Date input */}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={allowFuture ? undefined : today}
        className="input w-full"
      />
    </div>
  )
}
