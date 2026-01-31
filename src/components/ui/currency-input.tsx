'use client'

import { useState, useEffect } from 'react'

interface CurrencyInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  required?: boolean
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  className = '',
  autoFocus = false,
  required = false,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('')

  // Format number with commas
  function formatWithCommas(num: string): string {
    // Remove non-digits except decimal point
    const cleaned = num.replace(/[^\d.]/g, '')

    // Split by decimal point
    const parts = cleaned.split('.')

    // Format the integer part with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')

    // Rejoin with decimal if exists (limit to 2 decimal places)
    if (parts.length > 1) {
      return parts[0] + '.' + parts[1].slice(0, 2)
    }
    return parts[0]
  }

  // Parse formatted string back to raw number
  function parseToRaw(formatted: string): string {
    return formatted.replace(/,/g, '')
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

  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xl">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`input pl-10 text-2xl font-bold h-16 ${className}`}
        autoFocus={autoFocus}
        required={required}
      />
    </div>
  )
}
