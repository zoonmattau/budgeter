'use client'

import { format, subDays } from 'date-fns'

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  label?: string
}

export function DatePicker({ value, onChange, label }: DatePickerProps) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  return (
    <div>
      {label && <label className="label">{label}</label>}

      {/* Quick shortcuts */}
      <div className="flex gap-2 mb-2">
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
      </div>

      {/* Date input */}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={today}
        className="input w-full"
      />
    </div>
  )
}
