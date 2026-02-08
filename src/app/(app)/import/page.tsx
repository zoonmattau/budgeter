'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'

// --- Types ---

type ColumnRole = 'date' | 'description' | 'amount' | 'debit' | 'credit' | 'skip'

interface ParsedRow {
  raw: string[]
  date: string
  description: string
  amount: number
  type: 'expense' | 'income'
  category: string
}

// --- CSV Parsing ---

function detectDelimiter(text: string): string {
  const firstLines = text.split('\n').slice(0, 5).join('\n')
  const tabCount = (firstLines.match(/\t/g) || []).length
  const semiCount = (firstLines.match(/;/g) || []).length
  const commaCount = (firstLines.match(/,/g) || []).length
  if (tabCount > commaCount && tabCount > semiCount) return '\t'
  if (semiCount > commaCount) return ';'
  return ','
}

function splitCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === delimiter) {
        fields.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current.trim())
  return fields
}

function parseCSVText(text: string): { headers: string[]; rows: string[][] } {
  const delimiter = detectDelimiter(text)
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)

  if (lines.length === 0) return { headers: [], rows: [] }

  const allRows = lines.map(l => splitCSVLine(l, delimiter))
  // Detect if first row is a header
  const firstRow = allRows[0]
  const isHeader = firstRow.some(cell => {
    const lower = cell.toLowerCase().replace(/[^a-z ]/g, '').trim()
    return HEADER_PATTERNS.some(p => p.names.includes(lower))
  })

  if (isHeader) {
    return { headers: firstRow, rows: allRows.slice(1) }
  }
  // Generate synthetic headers
  const headers = firstRow.map((_, i) => `Column ${i + 1}`)
  return { headers, rows: allRows }
}

// --- Header Detection ---

const HEADER_PATTERNS: { role: ColumnRole; names: string[] }[] = [
  { role: 'date', names: ['date', 'trans date', 'transaction date', 'posting date', 'value date', 'effective date'] },
  { role: 'description', names: ['description', 'narrative', 'details', 'memo', 'merchant', 'payee', 'particulars', 'reference', 'transaction description'] },
  { role: 'amount', names: ['amount', 'value', 'sum', 'total'] },
  { role: 'debit', names: ['debit', 'debit amount', 'withdrawal', 'money out'] },
  { role: 'credit', names: ['credit', 'credit amount', 'deposit', 'money in'] },
]

function autoDetectColumns(headers: string[]): ColumnRole[] {
  return headers.map(h => {
    const lower = h.toLowerCase().replace(/[^a-z ]/g, '').trim()
    for (const pattern of HEADER_PATTERNS) {
      if (pattern.names.includes(lower)) return pattern.role
    }
    return 'skip'
  })
}

// --- Date parsing ---

function parseDate(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Try ISO format first (yyyy-mm-dd)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed.slice(0, 10))
    if (!isNaN(d.getTime())) return trimmed.slice(0, 10)
  }

  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (dmy) {
    const day = parseInt(dmy[1])
    const month = parseInt(dmy[2])
    let year = parseInt(dmy[3])
    if (year < 100) year += 2000
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day)
      if (!isNaN(d.getTime())) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }
  }

  // mm/dd/yyyy - try if day > 12 didn't match above (ambiguous case: default dd/mm)
  // We default to dd/mm/yyyy for Australian bank formats

  // Fallback: let JS parse it
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10)
  }

  return null
}

function parseAmount(raw: string): number {
  // Remove currency symbols, spaces, and thousand separators
  const cleaned = raw.replace(/[^0-9.\-+(),]/g, '')
  // Handle parentheses as negative: (100.00) => -100.00
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    return -Math.abs(parseFloat(cleaned.replace(/[()]/g, '')) || 0)
  }
  return parseFloat(cleaned) || 0
}

// --- Component ---

export default function ImportPage() {
  const [step, setStep] = useState<'upload' | 'map' | 'done'>('upload')
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Parsed CSV state
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [columnRoles, setColumnRoles] = useState<ColumnRole[]>([])

  // Transactions & categories
  const [transactions, setTransactions] = useState<ParsedRow[]>([])
  const [categories, setCategories] = useState<Tables<'categories'>[]>([])
  const [defaultCategory, setDefaultCategory] = useState('')

  // Import state
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

  const supabase = createClient()

  // Load user categories on mount
  useEffect(() => {
    async function loadCategories() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name')
      if (data) {
        setCategories(data)
        // Default to first expense category
        const first = data.find(c => c.type === 'expense')
        if (first) setDefaultCategory(first.name)
      }
    }
    loadCategories()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Build transactions from parsed rows whenever column mapping changes
  const buildTransactions = useCallback(() => {
    const dateIdx = columnRoles.indexOf('date')
    const descIdx = columnRoles.indexOf('description')
    const amountIdx = columnRoles.indexOf('amount')
    const debitIdx = columnRoles.indexOf('debit')
    const creditIdx = columnRoles.indexOf('credit')

    if (dateIdx === -1 || descIdx === -1 || (amountIdx === -1 && debitIdx === -1 && creditIdx === -1)) {
      return
    }

    const parsed: ParsedRow[] = []
    for (const row of rows) {
      const dateStr = parseDate(row[dateIdx] || '')
      if (!dateStr) continue

      const desc = (row[descIdx] || '').trim()
      if (!desc) continue

      let amount: number
      let type: 'expense' | 'income'

      if (amountIdx !== -1) {
        amount = parseAmount(row[amountIdx] || '0')
        type = amount >= 0 ? 'income' : 'expense'
      } else {
        const debit = debitIdx !== -1 ? parseAmount(row[debitIdx] || '0') : 0
        const credit = creditIdx !== -1 ? parseAmount(row[creditIdx] || '0') : 0
        if (Math.abs(debit) > 0) {
          amount = -Math.abs(debit)
          type = 'expense'
        } else {
          amount = Math.abs(credit)
          type = 'income'
        }
      }

      parsed.push({
        raw: row,
        date: dateStr,
        description: desc,
        amount: Math.abs(amount),
        type,
        category: defaultCategory,
      })
    }
    setTransactions(parsed)
  }, [rows, columnRoles, defaultCategory])

  useEffect(() => {
    if (rows.length > 0 && columnRoles.length > 0) {
      buildTransactions()
    }
  }, [rows, columnRoles, buildTransactions])

  // --- Handlers ---

  async function handleParseCSV() {
    let text = ''
    if (file) {
      text = await file.text()
    } else if (pastedText) {
      text = pastedText
    }

    if (!text.trim()) {
      setError('No data provided')
      return
    }

    setError(null)
    const { headers: h, rows: r } = parseCSVText(text)

    if (r.length === 0) {
      setError('No data rows found in the file')
      return
    }

    setHeaders(h)
    setRows(r)

    const roles = autoDetectColumns(h)
    setColumnRoles(roles)
    setStep('map')
  }

  function setColumnRole(index: number, role: ColumnRole) {
    setColumnRoles(prev => {
      const updated = [...prev]
      // If assigning a unique role (date/description/amount), unset it from other columns
      if (role !== 'skip') {
        for (let i = 0; i < updated.length; i++) {
          if (updated[i] === role && i !== index) {
            // Allow multiple 'skip' but unique for others
            // debit/credit can coexist, but date/description/amount are unique
            if (role === 'date' || role === 'description' || role === 'amount') {
              updated[i] = 'skip'
            }
          }
        }
      }
      updated[index] = role
      return updated
    })
  }

  function setTransactionCategory(index: number, category: string) {
    setTransactions(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], category }
      return updated
    })
  }

  function setTransactionType(index: number, type: 'expense' | 'income') {
    setTransactions(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], type }
      return updated
    })
  }

  function applyDefaultCategory(cat: string) {
    setDefaultCategory(cat)
    setTransactions(prev => prev.map(tx => ({ ...tx, category: cat })))
  }

  async function handleImport() {
    if (transactions.length === 0) return

    setImporting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        setImporting(false)
        return
      }

      // Build category map
      const { data: existingCategories } = await supabase
        .from('categories')
        .select('id, name, type')
        .eq('user_id', user.id)

      const categoryMap = new Map(
        existingCategories?.map(c => [c.name.toLowerCase(), c.id]) || []
      )

      let imported = 0

      for (const tx of transactions) {
        let categoryId = categoryMap.get(tx.category.toLowerCase())

        if (!categoryId) {
          const { data: newCat } = await supabase
            .from('categories')
            .insert({
              user_id: user.id,
              name: tx.category,
              icon: 'tag',
              color: '#6366f1',
              type: tx.type,
            })
            .select()
            .single()

          if (newCat) {
            categoryId = newCat.id
            categoryMap.set(tx.category.toLowerCase(), newCat.id)
          }
        }

        if (categoryId) {
          const { error: insertError } = await supabase.from('transactions').insert({
            user_id: user.id,
            category_id: categoryId,
            amount: tx.amount,
            type: tx.type,
            description: tx.description,
            date: tx.date,
          })
          if (!insertError) imported++
        }
      }

      setImportedCount(imported)
      setStep('done')
    } catch {
      setError('An error occurred during import. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  // --- Validation ---

  const hasDateColumn = columnRoles.includes('date')
  const hasDescColumn = columnRoles.includes('description')
  const hasAmountColumn = columnRoles.includes('amount') || columnRoles.includes('debit') || columnRoles.includes('credit')
  const mappingValid = hasDateColumn && hasDescColumn && hasAmountColumn

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Import Transactions</h1>
          <p className="text-sm text-gray-500">Upload a CSV from your bank</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ====== STEP 1: Upload ====== */}
      {step === 'upload' && (
        <>
          {/* Mode tabs */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setInputMode('upload')}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                inputMode === 'upload'
                  ? 'border-bloom-500 bg-bloom-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <Upload className={`w-5 h-5 mx-auto mb-1 ${inputMode === 'upload' ? 'text-bloom-600' : 'text-gray-400'}`} />
              <p className="text-xs font-medium">Upload File</p>
            </button>
            <button
              onClick={() => setInputMode('paste')}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                inputMode === 'paste'
                  ? 'border-bloom-500 bg-bloom-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <FileText className={`w-5 h-5 mx-auto mb-1 ${inputMode === 'paste' ? 'text-bloom-600' : 'text-gray-400'}`} />
              <p className="text-xs font-medium">Paste Data</p>
            </button>
          </div>

          {/* Upload area */}
          {inputMode === 'upload' && (
            <div className="card">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-bloom-500 bg-bloom-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDragging(false)
                  const droppedFile = e.dataTransfer.files[0]
                  if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.txt'))) {
                    setFile(droppedFile)
                    setError(null)
                  } else {
                    setError('Please upload a CSV or TXT file')
                  }
                }}
              >
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => { setFile(e.target.files?.[0] || null); setError(null) }}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer block">
                  {file ? (
                    <>
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-sprout-500" />
                      <p className="font-medium text-sprout-700">{file.name}</p>
                      <p className="text-sm text-gray-400 mt-1">Ready to parse</p>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setFile(null) }}
                        className="text-xs text-gray-400 hover:text-gray-600 mt-2 underline"
                      >
                        Remove file
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-bloom-500' : 'text-gray-400'}`} />
                      <p className="font-medium text-gray-700">
                        {isDragging ? 'Drop file here' : 'Drop your bank statement here'}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">CSV or TXT format, or click to browse</p>
                    </>
                  )}
                </label>
              </div>

              <button
                onClick={handleParseCSV}
                disabled={!file}
                className="btn-primary w-full mt-4"
              >
                <FileText className="w-4 h-4" />
                Parse CSV
              </button>
            </div>
          )}

          {/* Paste area */}
          {inputMode === 'paste' && (
            <div className="card">
              <p className="text-sm text-gray-500 mb-3">
                Paste your bank statement data below (CSV, tab-separated, or semicolon-separated)
              </p>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={"Date,Description,Amount\n01/01/2024,NETFLIX,-15.99\n02/01/2024,SALARY,3500.00"}
                className="input min-h-[200px] font-mono text-sm"
              />
              <button
                onClick={handleParseCSV}
                disabled={!pastedText.trim()}
                className="btn-primary w-full mt-4"
              >
                <FileText className="w-4 h-4" />
                Parse Data
              </button>
            </div>
          )}
        </>
      )}

      {/* ====== STEP 2: Map & Preview ====== */}
      {step === 'map' && (
        <div className="space-y-6">
          <button
            onClick={() => { setStep('upload'); setTransactions([]); setHeaders([]); setRows([]) }}
            className="text-sm text-bloom-600 hover:text-bloom-700"
          >
            &larr; Back to upload
          </button>

          {/* Column Mapping */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Map Columns</h3>
            <p className="text-sm text-gray-500 mb-4">
              Assign each column to a field. You need at least Date, Description, and Amount (or Debit/Credit).
            </p>

            <div className="space-y-2">
              {headers.map((header, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-40 truncate flex-shrink-0" title={header}>
                    {header}
                  </span>
                  <div className="relative flex-1">
                    <select
                      value={columnRoles[i] || 'skip'}
                      onChange={(e) => setColumnRole(i, e.target.value as ColumnRole)}
                      className="input pr-8 text-sm appearance-none"
                    >
                      <option value="skip">Skip</option>
                      <option value="date">Date</option>
                      <option value="description">Description</option>
                      <option value="amount">Amount (+/-)</option>
                      <option value="debit">Debit (expense)</option>
                      <option value="credit">Credit (income)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>

            {!mappingValid && (
              <p className="text-xs text-amber-600 mt-3">
                Please map Date, Description, and at least one of Amount / Debit / Credit.
              </p>
            )}
          </div>

          {/* Default Category */}
          {mappingValid && transactions.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Default Category</h3>
              <p className="text-sm text-gray-500 mb-3">
                Applied to all transactions. You can override per-row below.
              </p>
              <div className="relative">
                <select
                  value={defaultCategory}
                  onChange={(e) => applyDefaultCategory(e.target.value)}
                  className="input pr-8 text-sm appearance-none"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name} ({c.type})</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Transaction Preview */}
          {mappingValid && transactions.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  Preview ({transactions.length} transactions)
                </h3>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="text-xs bg-bloom-100 text-bloom-700 px-3 py-1.5 rounded-full hover:bg-bloom-200 transition-colors flex items-center gap-1"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import All'
                  )}
                </button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {transactions.map((tx, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                      <p className="text-xs text-gray-400">{tx.date}</p>
                    </div>

                    {/* Per-row category */}
                    <div className="relative hidden group-hover:block sm:block">
                      <select
                        value={tx.category}
                        onChange={(e) => setTransactionCategory(i, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 pr-6 appearance-none bg-white"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Type toggle */}
                    <button
                      onClick={() => setTransactionType(i, tx.type === 'expense' ? 'income' : 'expense')}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        tx.type === 'income'
                          ? 'bg-sprout-100 text-sprout-700'
                          : 'bg-red-50 text-red-600'
                      }`}
                      title="Click to toggle income/expense"
                    >
                      {tx.type === 'income' ? 'Income' : 'Expense'}
                    </button>

                    <span className={`text-sm font-medium tabular-nums w-24 text-right ${
                      tx.type === 'income' ? 'text-sprout-600' : 'text-gray-900'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>

                    {/* Remove row */}
                    <button
                      onClick={() => setTransactions(prev => prev.filter((_, j) => j !== i))}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mappingValid && transactions.length === 0 && rows.length > 0 && (
            <div className="card text-center py-6">
              <p className="text-gray-500 text-sm">
                No valid transactions found. Check your column mapping — dates or amounts may not be parsing correctly.
              </p>
            </div>
          )}

          {/* Import button at bottom */}
          {mappingValid && transactions.length > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="btn-primary w-full"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing {transactions.length} transactions...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import {transactions.length} Transactions
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* ====== STEP 3: Done ====== */}
      {step === 'done' && (
        <div className="card text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-sprout-500 mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
            Import Complete
          </h3>
          <p className="text-gray-500 mb-6">
            Successfully imported {importedCount} transaction{importedCount !== 1 ? 's' : ''}.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard" className="btn-primary">
              Go to Dashboard
            </Link>
            <button
              onClick={() => {
                setStep('upload')
                setFile(null)
                setPastedText('')
                setHeaders([])
                setRows([])
                setColumnRoles([])
                setTransactions([])
                setImportedCount(0)
                setError(null)
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Import More
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
