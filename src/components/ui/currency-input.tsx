'use client'

import { useState, useEffect } from 'react'

interface CurrencyInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  required?: boolean
  id?: string
  isNegative?: boolean
  allowNegative?: boolean
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  className = '',
  autoFocus = false,
  required = false,
  id,
  isNegative = false,
  allowNegative = false,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('')

  // Format number with commas (preserving leading minus if allowed)
  function formatWithCommas(num: string): string {
    // Check for leading minus
    const hasNeg = allowNegative && num.startsWith('-')

    // Remove non-digits except decimal point
    const cleaned = num.replace(/[^\d.]/g, '')

    // Split by decimal point
    const parts = cleaned.split('.')

    // Format the integer part with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')

    // Rejoin with decimal if exists (limit to 2 decimal places)
    let result = parts.length > 1
      ? parts[0] + '.' + parts[1].slice(0, 2)
      : parts[0]

    if (hasNeg && result !== '' && result !== '0') {
      result = '-' + result
    }
    return result
  }

  // Parse formatted string back to raw number
  function parseToRaw(formatted: string): string {
    const hasNeg = formatted.startsWith('-')
    const raw = formatted.replace(/[^0-9.]/g, '')
    return hasNeg ? '-' + raw : raw
  }

  // Update display when value prop changes
  useEffect(() => {
    if (value) {
      setDisplayValue(formatWithCommas(value))
    } else {
      setDisplayValue('')
    }
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target.value
    const formatted = formatWithCommas(input)
    const raw = parseToRaw(formatted)

    setDisplayValue(formatted)
    onChange(raw)
  }

  const showNeg = isNegative || (allowNegative && displayValue.startsWith('-'))

  return (
    <div className="relative">
      <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-medium text-xl ${showNeg ? 'text-red-500' : 'text-gray-400'}`}>
        {showNeg ? '-$' : '$'}
      </span>
      <input
        id={id}
        type="text"
        inputMode={allowNegative ? 'text' : 'decimal'}
        value={displayValue.replace(/^-/, '')}
        onChange={(e) => {
          // Re-inject the minus prefix if present
          const raw = showNeg ? '-' + e.target.value : e.target.value
          handleChange({ ...e, target: { ...e.target, value: raw } } as React.ChangeEvent<HTMLInputElement>)
        }}
        placeholder={placeholder}
        className={`input ${showNeg ? 'pl-12' : 'pl-10'} text-2xl font-bold h-16 ${showNeg ? 'text-red-600' : ''} ${className}`}
        autoFocus={autoFocus}
        required={required}
      />
      {allowNegative && (
        <button
          type="button"
          onClick={() => {
            if (displayValue.startsWith('-')) {
              const pos = displayValue.slice(1)
              setDisplayValue(pos)
              onChange(parseToRaw(pos))
            } else if (displayValue) {
              const neg = '-' + displayValue
              setDisplayValue(neg)
              onChange(parseToRaw(neg))
            }
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          {showNeg ? '+' : '−'}
        </button>
      )}
    </div>
  )
}
