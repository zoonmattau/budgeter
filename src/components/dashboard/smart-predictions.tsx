'use client'

import { useState } from 'react'
import { differenceInDays, isToday, isTomorrow, isYesterday } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { CategoryChip } from '@/components/ui/category-chip'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Category {
  id: string
  name: string
  icon: string
  color: string
}

interface Pattern {
  id: string
  name: string
  normalized_name: string
  typical_amount: number
  frequency: string
  confidence: number
  category_id: string | null
  categories: Category | null
}

interface Prediction {
  id: string
  pattern_id: string
  predicted_date: string
  predicted_amount: number
  status: string
  payment_patterns: Pattern | null
}

interface SmartPredictionsProps {
  predictions: Prediction[]
  expenseCategories: { id: string; name: string; icon: string; color: string }[]
}

export function SmartPredictions({ predictions, expenseCategories }: SmartPredictionsProps) {
  const [localPredictions, setLocalPredictions] = useState(predictions)
  const [expanded, setExpanded] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [, setShowLogModal] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  if (localPredictions.length === 0) {
    return null
  }

  const visiblePredictions = expanded ? localPredictions : localPredictions.slice(0, 2)
  const hasMore = localPredictions.length > 2

  const handleDismiss = async (predictionId: string, patternId: string) => {
    setProcessingId(predictionId)
    try {
      // Update prediction status
      await supabase
        .from('pattern_predictions')
        .update({
          status: 'dismissed',
          resolved_at: new Date().toISOString()
        })
        .eq('id', predictionId)

      // Decrease pattern confidence
      const { data: pattern } = await supabase
        .from('payment_patterns')
        .select('confidence')
        .eq('id', patternId)
        .single()

      if (pattern) {
        const newConfidence = Math.max(0.1, Number(pattern.confidence) - 0.1)
        await supabase
          .from('payment_patterns')
          .update({
            confidence: newConfidence,
            updated_at: new Date().toISOString()
          })
          .eq('id', patternId)
      }

      // Remove from local state
      setLocalPredictions(prev => prev.filter(p => p.id !== predictionId))
    } catch (error) {
      console.error('Error dismissing prediction:', error)
    }
    setProcessingId(null)
  }

  const handleConfirm = async (predictionId: string, patternId: string) => {
    setProcessingId(predictionId)
    try {
      // Update prediction status
      await supabase
        .from('pattern_predictions')
        .update({
          status: 'matched',
          resolved_at: new Date().toISOString()
        })
        .eq('id', predictionId)

      // Increase pattern confidence
      const { data: pattern } = await supabase
        .from('payment_patterns')
        .select('confidence, occurrence_count')
        .eq('id', patternId)
        .single()

      if (pattern) {
        const newConfidence = Math.min(0.99, Number(pattern.confidence) + 0.05)
        await supabase
          .from('payment_patterns')
          .update({
            confidence: newConfidence,
            occurrence_count: (pattern.occurrence_count || 1) + 1,
            last_occurrence: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('id', patternId)
      }

      // Remove from local state
      setLocalPredictions(prev => prev.filter(p => p.id !== predictionId))
    } catch (error) {
      console.error('Error confirming prediction:', error)
    }
    setProcessingId(null)
  }

  const handleLogPayment = async (prediction: Prediction, accountId?: string) => {
    if (!prediction.payment_patterns) return
    setProcessingId(prediction.id)

    try {
      const pattern = prediction.payment_patterns
      const categoryId = pattern.category_id || expenseCategories[0]?.id

      if (!categoryId) {
        console.error('No category available')
        return
      }

      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create the transaction
      const { data: tx, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          category_id: categoryId,
          account_id: accountId || null,
          amount: Number(prediction.predicted_amount),
          type: 'expense',
          description: pattern.name,
          date: new Date().toISOString().split('T')[0],
          is_recurring: true
        })
        .select()
        .single()

      if (error) throw error

      // Update prediction as matched
      await supabase
        .from('pattern_predictions')
        .update({
          status: 'matched',
          matched_transaction_id: tx.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', prediction.id)

      // Update pattern
      const { data: patternData } = await supabase
        .from('payment_patterns')
        .select('confidence, occurrence_count')
        .eq('id', pattern.id)
        .single()

      if (patternData) {
        await supabase
          .from('payment_patterns')
          .update({
            confidence: Math.min(0.99, Number(patternData.confidence) + 0.05),
            occurrence_count: (patternData.occurrence_count || 1) + 1,
            last_occurrence: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('id', pattern.id)
      }

      // Remove from local state
      setLocalPredictions(prev => prev.filter(p => p.id !== prediction.id))
      setShowLogModal(null)
      router.refresh()
    } catch (error) {
      console.error('Error logging payment:', error)
    }
    setProcessingId(null)
  }

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) return 'Due today'
    if (isTomorrow(date)) return 'Due tomorrow'
    if (isYesterday(date)) return 'Due yesterday'

    const diff = differenceInDays(date, new Date())
    if (diff < 0) return `${Math.abs(diff)} days overdue`
    if (diff === 1) return 'In 1 day'
    return `In ${diff} days`
  }

  const getDateClass = (dateStr: string) => {
    const date = new Date(dateStr)
    const diff = differenceInDays(date, new Date())
    if (diff < 0) return 'text-coral-500 font-medium'
    if (diff <= 1) return 'text-amber-500 font-medium'
    return 'text-gray-400'
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-gray-900">Smart Predictions</h2>
          <span className="text-xs bg-bloom-100 text-bloom-700 px-2 py-0.5 rounded-full">
            AI
          </span>
        </div>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-bloom-600 hover:text-bloom-700 font-medium"
          >
            {expanded ? 'Show less' : `+${localPredictions.length - 2} more`}
          </button>
        )}
      </div>

      <div className="card divide-y divide-gray-50">
        {visiblePredictions.map((prediction) => {
          const pattern = prediction.payment_patterns
          if (!pattern) return null

          const confidence = Math.round(Number(pattern.confidence) * 100)
          const isProcessing = processingId === prediction.id

          return (
            <div key={prediction.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {pattern.categories ? (
                    <CategoryChip
                      name={pattern.categories.name}
                      color={pattern.categories.color}
                      icon={pattern.categories.icon}
                      size="sm"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">?</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{pattern.name}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={getDateClass(prediction.predicted_date)}>
                        {getDateLabel(prediction.predicted_date)}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-400">{confidence}% confident</span>
                    </div>
                  </div>
                </div>
                <p className="font-semibold text-gray-900 shrink-0">
                  {formatCurrency(Number(prediction.predicted_amount))}
                </p>
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2 mt-3 ml-11">
                <button
                  onClick={() => handleLogPayment(prediction)}
                  disabled={isProcessing}
                  className="text-xs px-3 py-1.5 bg-bloom-500 text-white rounded-full hover:bg-bloom-600 disabled:opacity-50 transition-colors"
                >
                  Log Payment
                </button>
                <button
                  onClick={() => handleConfirm(prediction.id, pattern.id)}
                  disabled={isProcessing}
                  className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Already Paid
                </button>
                <button
                  onClick={() => handleDismiss(prediction.id, pattern.id)}
                  disabled={isProcessing}
                  className="text-xs px-3 py-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
