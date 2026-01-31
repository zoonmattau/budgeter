'use client'

interface TogglePillsProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  variant?: 'default' | 'expense-income'
}

export function TogglePills<T extends string>({
  options,
  value,
  onChange,
  variant = 'default',
}: TogglePillsProps<T>) {
  const getActiveStyles = (optionValue: T) => {
    if (variant === 'expense-income') {
      if (optionValue === 'expense') {
        return 'bg-bloom-500 text-white shadow-md shadow-bloom-500/30'
      }
      if (optionValue === 'income') {
        return 'bg-sprout-500 text-white shadow-md shadow-sprout-500/30'
      }
    }
    return 'bg-bloom-500 text-white shadow-md shadow-bloom-500/30'
  }

  return (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            value === option.value
              ? getActiveStyles(option.value)
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
