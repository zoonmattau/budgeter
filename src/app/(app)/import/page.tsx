'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Plus,
  Loader2,
  RefreshCw,
  Lightbulb,
  Calendar
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface Transaction {
  date: string
  description: string
  amount: number
  type: 'expense' | 'income'
  suggested_category: string
  is_recurring: boolean
  recurring_frequency: string | null
  merchant: string
}

interface RecurringBill {
  name: string
  amount: number
  frequency: string
  typical_day: number
  category: string
}

interface SpendingCategory {
  category: string
  amount: number
  percentage: number
}

interface Analysis {
  transactions: Transaction[]
  recurring_bills: RecurringBill[]
  insights: {
    total_income: number
    total_expenses: number
    top_spending_categories: SpendingCategory[]
    savings_rate: number
    recommendations: string[]
  }
}

export default function ImportPage() {
  const [mode, setMode] = useState<'upload' | 'paste' | 'scan'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [scanResults, setScanResults] = useState<{
    suggested_bills: Array<{
      name: string
      amount: number
      frequency: string
      typical_day: number
      category: string
      confidence: string
      evidence: string
    }>
    spending_patterns: Array<{
      pattern: string
      insight: string
      suggestion: string
    }>
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [createdBills, setCreatedBills] = useState<string[]>([])

  const supabase = createClient()

  async function handleAnalyze() {
    if (!file && !pastedText) {
      setError('Please upload a file or paste your statement data')
      return
    }

    setAnalyzing(true)
    setError(null)

    try {
      const formData = new FormData()
      if (file) {
        formData.append('file', file)
      }
      if (pastedText) {
        formData.append('text', pastedText)
      }

      const response = await fetch('/api/analyze-statement', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyse statement')
      }

      if (data.error) {
        throw new Error(data.error)
      }

      setAnalysis(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyse statement'
      setError(message)
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleScanPatterns() {
    setScanning(true)
    setError(null)

    try {
      const response = await fetch('/api/detect-patterns', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to scan patterns')
      }

      const data = await response.json()
      if (data.error) {
        setError(data.error)
      } else {
        setScanResults(data)
      }
    } catch {
      setError('Failed to scan for patterns. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  async function handleImportTransactions() {
    if (!analysis) return

    setImporting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get or create categories
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', user.id)

    const categoryMap = new Map(existingCategories?.map(c => [c.name.toLowerCase(), c.id]) || [])

    let imported = 0

    for (const tx of analysis.transactions) {
      // Find or create category
      let categoryId = categoryMap.get(tx.suggested_category.toLowerCase())

      if (!categoryId) {
        const { data: newCat } = await supabase
          .from('categories')
          .insert({
            user_id: user.id,
            name: tx.suggested_category,
            icon: 'tag',
            color: '#6366f1',
            type: tx.type,
          })
          .select()
          .single()

        if (newCat) {
          categoryId = newCat.id
          categoryMap.set(tx.suggested_category.toLowerCase(), newCat.id)
        }
      }

      if (categoryId) {
        const { error } = await supabase.from('transactions').insert({
          user_id: user.id,
          category_id: categoryId,
          amount: Math.abs(tx.amount),
          type: tx.type,
          description: tx.merchant || tx.description,
          date: tx.date,
        })

        if (!error) imported++
      }
    }

    setImportedCount(imported)
    setImporting(false)
  }

  async function handleCreateBill(bill: RecurringBill | { name: string; amount: number; frequency: string; typical_day: number; category: string }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get or create category
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', user.id)

    let categoryId = existingCategories?.find(c => c.name.toLowerCase() === bill.category.toLowerCase())?.id

    if (!categoryId) {
      const { data: newCat } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: bill.category,
          icon: 'receipt',
          color: '#f59e0b',
          type: 'expense',
        })
        .select()
        .single()

      categoryId = newCat?.id
    }

    if (!categoryId) return

    // Calculate next due date
    const today = new Date()
    const nextDue = new Date(today.getFullYear(), today.getMonth(), bill.typical_day)
    if (nextDue <= today) {
      nextDue.setMonth(nextDue.getMonth() + 1)
    }

    const { error } = await supabase.from('bills').insert({
      user_id: user.id,
      category_id: categoryId,
      name: bill.name,
      amount: bill.amount,
      frequency: bill.frequency as 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly',
      due_day: bill.typical_day,
      next_due: nextDue.toISOString().split('T')[0],
      is_active: true,
    })

    if (!error) {
      setCreatedBills(prev => [...prev, bill.name])
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Smart Import</h1>
          <p className="text-sm text-gray-500">Let us analyse your spending</p>
        </div>
      </div>

      {/* Mode Selection */}
      {!analysis && !scanResults && (
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setMode('upload')}
            className={`p-3 rounded-xl border-2 text-center transition-all ${
              mode === 'upload'
                ? 'border-bloom-500 bg-bloom-50'
                : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <Upload className={`w-5 h-5 mx-auto mb-1 ${mode === 'upload' ? 'text-bloom-600' : 'text-gray-400'}`} />
            <p className="text-xs font-medium">Upload File</p>
          </button>
          <button
            onClick={() => setMode('paste')}
            className={`p-3 rounded-xl border-2 text-center transition-all ${
              mode === 'paste'
                ? 'border-bloom-500 bg-bloom-50'
                : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <FileText className={`w-5 h-5 mx-auto mb-1 ${mode === 'paste' ? 'text-bloom-600' : 'text-gray-400'}`} />
            <p className="text-xs font-medium">Paste Data</p>
          </button>
          <button
            onClick={() => setMode('scan')}
            className={`p-3 rounded-xl border-2 text-center transition-all ${
              mode === 'scan'
                ? 'border-bloom-500 bg-bloom-50'
                : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <Sparkles className={`w-5 h-5 mx-auto mb-1 ${mode === 'scan' ? 'text-bloom-600' : 'text-gray-400'}`} />
            <p className="text-xs font-medium">Scan Patterns</p>
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Upload Mode */}
      {mode === 'upload' && !analysis && (
        <div className="card">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              isDragging
                ? 'border-bloom-500 bg-bloom-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDragging(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDragging(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDragging(false)
              const droppedFile = e.dataTransfer.files[0]
              if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.txt'))) {
                setFile(droppedFile)
              } else {
                setError('Please upload a CSV or TXT file')
              }
            }}
          >
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              {file ? (
                <>
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-sprout-500" />
                  <p className="font-medium text-sprout-700">{file.name}</p>
                  <p className="text-sm text-gray-400 mt-1">Ready to analyse</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setFile(null)
                    }}
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
            onClick={handleAnalyze}
            disabled={!file || analyzing}
            className="btn-primary w-full mt-4"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analysing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyse Statement
              </>
            )}
          </button>
        </div>
      )}

      {/* Paste Mode */}
      {mode === 'paste' && !analysis && (
        <div className="card">
          <p className="text-sm text-gray-500 mb-3">
            Paste your bank statement data below (copy from your bank&apos;s website or statement)
          </p>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="01/01/2024  NETFLIX  -15.99&#10;02/01/2024  SALARY  +3500.00&#10;..."
            className="input min-h-[200px] font-mono text-sm"
          />

          <button
            onClick={handleAnalyze}
            disabled={!pastedText || analyzing}
            className="btn-primary w-full mt-4"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analysing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyse Data
              </>
            )}
          </button>
        </div>
      )}

      {/* Scan Mode */}
      {mode === 'scan' && !scanResults && (
        <div className="card text-center py-8">
          <RefreshCw className="w-12 h-12 text-bloom-400 mx-auto mb-4" />
          <h3 className="font-display font-semibold text-gray-900 mb-2">
            Scan Your Transactions
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
            We&apos;ll analyse your existing transactions to find recurring bills and spending patterns
          </p>
          <button
            onClick={handleScanPatterns}
            disabled={scanning}
            className="btn-primary"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Start Scan
              </>
            )}
          </button>
        </div>
      )}

      {/* Scan Results */}
      {scanResults && (
        <div className="space-y-6">
          <button
            onClick={() => setScanResults(null)}
            className="text-sm text-bloom-600 hover:text-bloom-700"
          >
            ← Back to scan options
          </button>

          {/* Suggested Bills */}
          {scanResults.suggested_bills.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-bloom-500" />
                <h3 className="font-semibold text-gray-900">Suggested Bills</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                We found these recurring payments in your transactions
              </p>

              <div className="space-y-3">
                {scanResults.suggested_bills.map((bill, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{bill.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(bill.amount)} • {bill.frequency} • Day {bill.typical_day}
                        </p>
                      </div>
                      {createdBills.includes(bill.name) ? (
                        <span className="text-xs bg-sprout-100 text-sprout-700 px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Added
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCreateBill(bill)}
                          className="text-xs bg-bloom-100 text-bloom-700 px-3 py-1.5 rounded-full hover:bg-bloom-200 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Bill
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{bill.evidence}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      bill.confidence === 'high' ? 'bg-sprout-100 text-sprout-700' :
                      bill.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {bill.confidence} confidence
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spending Patterns */}
          {scanResults.spending_patterns.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-gray-900">Spending Insights</h3>
              </div>

              <div className="space-y-4">
                {scanResults.spending_patterns.map((pattern, i) => (
                  <div key={i} className="p-4 bg-amber-50 rounded-xl">
                    <p className="font-medium text-gray-900 mb-1">{pattern.pattern}</p>
                    <p className="text-sm text-gray-600 mb-2">{pattern.insight}</p>
                    <p className="text-sm text-amber-700 font-medium">💡 {pattern.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {scanResults.suggested_bills.length === 0 && scanResults.spending_patterns.length === 0 && (
            <div className="card text-center py-8">
              <p className="text-gray-500">No patterns found. Add more transactions to get insights.</p>
            </div>
          )}
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          <button
            onClick={() => setAnalysis(null)}
            className="text-sm text-bloom-600 hover:text-bloom-700"
          >
            ← Analyse another statement
          </button>

          {/* Summary Card */}
          <div className="card bg-gradient-to-br from-bloom-50 to-sprout-50">
            <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-sprout-600 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium">Income</span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(analysis.insights.total_income)}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-red-500 mb-1">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-xs font-medium">Expenses</span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(analysis.insights.total_expenses)}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200/50">
              <p className="text-sm text-gray-600">
                Savings rate: <span className="font-semibold text-sprout-600">{analysis.insights.savings_rate.toFixed(1)}%</span>
              </p>
            </div>
          </div>

          {/* Top Categories */}
          {analysis.insights.top_spending_categories.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Top Spending Categories</h3>
              <div className="space-y-3">
                {analysis.insights.top_spending_categories.map((cat, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{cat.category}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(cat.amount)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-bloom-500 rounded-full"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.insights.recommendations.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-gray-900">Recommendations</h3>
              </div>
              <div className="space-y-3">
                {analysis.insights.recommendations.map((rec, i) => (
                  <div key={i} className="p-3 bg-amber-50 rounded-xl text-sm text-amber-800">
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detected Recurring Bills */}
          {analysis.recurring_bills.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-bloom-500" />
                <h3 className="font-semibold text-gray-900">Detected Bills</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                We found these recurring payments. Add them as bills to track them.
              </p>

              <div className="space-y-2">
                {analysis.recurring_bills.map((bill, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">{bill.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(bill.amount)} • {bill.frequency} • Day {bill.typical_day}
                      </p>
                    </div>
                    {createdBills.includes(bill.name) ? (
                      <span className="text-xs bg-sprout-100 text-sprout-700 px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Added
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCreateBill(bill)}
                        className="text-xs bg-bloom-100 text-bloom-700 px-3 py-1.5 rounded-full hover:bg-bloom-200 transition-colors"
                      >
                        Add Bill
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                Transactions ({analysis.transactions.length})
              </h3>
              {importedCount > 0 ? (
                <span className="text-xs bg-sprout-100 text-sprout-700 px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {importedCount} imported
                </span>
              ) : (
                <button
                  onClick={handleImportTransactions}
                  disabled={importing}
                  className="text-xs bg-bloom-100 text-bloom-700 px-3 py-1.5 rounded-full hover:bg-bloom-200 transition-colors"
                >
                  {importing ? 'Importing...' : 'Import All'}
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {analysis.transactions.slice(0, 20).map((tx, i) => (
                <div key={i} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{tx.merchant}</p>
                    <p className="text-xs text-gray-400">{tx.date} • {tx.suggested_category}</p>
                  </div>
                  <span className={`text-sm font-medium ${tx.type === 'income' ? 'text-sprout-600' : 'text-gray-900'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                  </span>
                </div>
              ))}
              {analysis.transactions.length > 20 && (
                <p className="text-xs text-gray-400 text-center py-2">
                  And {analysis.transactions.length - 20} more transactions...
                </p>
              )}
            </div>
          </div>

          <Link href="/dashboard" className="btn-primary w-full">
            Done
          </Link>
        </div>
      )}
    </div>
  )
}
