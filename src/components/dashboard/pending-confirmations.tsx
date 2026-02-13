'use client'

import { useState } from 'react'
import { differenceInDays, isToday, format, addWeeks, addMonths } from 'date-fns'
import { DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CategoryChip } from '@/components/ui/category-chip'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Tables } from '@/lib/database.types'

type BillWithCategory = Tables<'bills'> & {
  categories: Tables<'categories'> | null
}

type IncomeEntry = Tables<'income_entries'>

interface Account {
  id: string
  name: string
  type: string
  balance: number
}

interface PendingConfirmationsProps {
  pendingBills: BillWithCategory[]
  pendingIncome: IncomeEntry[]
  bankAccounts: Account[]
  creditCards: Account[]
  incomeCategories: { id: string; name: string }[]
}

type PendingItem =
  | { kind: 'bill'; data: BillWithCategory }
  | { kind: 'income'; data: IncomeEntry }

function getDateLabel(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  if (isToday(date)) return 'Due today'
  const diff = differenceInDays(new Date(), date)
  if (diff === 1) return '1 day overdue'
  if (diff > 1) return `${diff} days overdue`
  return 'Due today'
}

function getDateClass(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  if (isToday(date)) return 'text-amber-500 font-medium'
  return 'text-coral-500 font-medium'
}

function advanceDate(currentDue: string, frequency: string): string {
  const date = new Date(currentDue)
  let next: Date
  switch (frequency) {
    case 'weekly':
      next = addWeeks(date, 1)
      break
    case 'fortnightly':
      next = addWeeks(date, 2)
      break
    case 'monthly':
      next = addMonths(date, 1)
      break
    case 'quarterly':
      next = addMonths(date, 3)
      break
    case 'yearly':
      next = addMonths(date, 12)
      break
    default:
      next = addMonths(date, 1)
  }
  return format(next, 'yyyy-MM-dd')
}

function incomeAmountForFrequency(monthlyAmount: number, frequency: string | null): number {
  switch (frequency) {
    case 'weekly': return monthlyAmount / 4.33
    case 'fortnightly': return monthlyAmount / 2.17
    case 'monthly': return monthlyAmount
    case 'quarterly': return monthlyAmount * 3
    case 'yearly': return monthlyAmount * 12
    default: return monthlyAmount
  }
}

export function PendingConfirmations({
  pendingBills,
  pendingIncome,
  bankAccounts,
  creditCards,
  incomeCategories,
}: PendingConfirmationsProps) {
  const router = useRouter()
  const supabase = createClient()

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [expandedConfirmId, setExpandedConfirmId] = useState<string | null>(null)
  const [expandedPostponeId, setExpandedPostponeId] = useState<string | null>(null)
  const [postponeDate, setPostponeDate] = useState('')

  // Build unified pending items list
  const allItems: PendingItem[] = [
    ...pendingBills.map((b): PendingItem => ({ kind: 'bill', data: b })),
    ...pendingIncome.map((i): PendingItem => ({ kind: 'income', data: i })),
  ].filter(item => {
    const id = item.kind === 'bill' ? item.data.id : item.data.id
    return !dismissedIds.has(id)
  })

  if (allItems.length === 0) return null

  const visibleItems = expanded ? allItems : allItems.slice(0, 3)
  const hasMore = allItems.length > 3

  // --- CONFIRM ---
  async function handleConfirmBill(bill: BillWithCategory, accountId: string) {
    setProcessingId(bill.id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create expense transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          household_id: bill.household_id,
          category_id: bill.category_id,
          amount: Number(bill.amount),
          type: 'expense',
          description: bill.name,
          date: format(new Date(), 'yyyy-MM-dd'),
          account_id: accountId,
          is_recurring: !bill.is_one_off,
          bill_id: bill.id,
        })

      if (txError) throw txError

      // Update account balance
      const account = [...bankAccounts, ...creditCards].find(a => a.id === accountId)
      if (account) {
        const isCreditCard = account.type === 'credit' || account.type === 'credit_card'
        const newBalance = isCreditCard
          ? account.balance + Number(bill.amount)  // debt increases
          : account.balance - Number(bill.amount)  // cash decreases

        await supabase
          .from('accounts')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', accountId)
      }

      // Advance schedule or deactivate
      if (bill.is_one_off) {
        await supabase
          .from('bills')
          .update({ is_active: false, saved_amount: 0 })
          .eq('id', bill.id)
      } else {
        const nextDue = advanceDate(bill.next_due, bill.frequency)
        await supabase
          .from('bills')
          .update({ next_due: nextDue, saved_amount: 0 })
          .eq('id', bill.id)
      }

      setDismissedIds(prev => new Set(prev).add(bill.id))
      setExpandedConfirmId(null)
      router.refresh()
    } catch (err) {
      console.error('Error confirming bill:', err)
    }
    setProcessingId(null)
  }

  async function handleConfirmIncome(income: IncomeEntry, accountId: string) {
    setProcessingId(income.id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const payAmount = incomeAmountForFrequency(Number(income.amount), income.pay_frequency)
      const categoryId = incomeCategories[0]?.id
      if (!categoryId) return

      // Create income transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          household_id: income.household_id,
          category_id: categoryId,
          amount: Math.round(payAmount * 100) / 100,
          type: 'income',
          description: income.source,
          date: format(new Date(), 'yyyy-MM-dd'),
          account_id: accountId,
          is_recurring: true,
        })

      if (txError) throw txError

      // Update bank balance (income deposits increase balance)
      const bank = bankAccounts.find(a => a.id === accountId)
      if (bank) {
        await supabase
          .from('accounts')
          .update({
            balance: bank.balance + Math.round(payAmount * 100) / 100,
            updated_at: new Date().toISOString(),
          })
          .eq('id', accountId)
      }

      // Advance next_pay_date
      if (income.next_pay_date && income.pay_frequency) {
        const nextDate = advanceDate(income.next_pay_date, income.pay_frequency)
        await supabase
          .from('income_entries')
          .update({ next_pay_date: nextDate })
          .eq('id', income.id)
      }

      setDismissedIds(prev => new Set(prev).add(income.id))
      setExpandedConfirmId(null)
      router.refresh()
    } catch (err) {
      console.error('Error confirming income:', err)
    }
    setProcessingId(null)
  }

  // --- SKIP ---
  async function handleSkipBill(bill: BillWithCategory) {
    setProcessingId(bill.id)
    try {
      if (bill.is_one_off) {
        await supabase
          .from('bills')
          .update({ is_active: false })
          .eq('id', bill.id)
      } else {
        const nextDue = advanceDate(bill.next_due, bill.frequency)
        await supabase
          .from('bills')
          .update({ next_due: nextDue })
          .eq('id', bill.id)
      }
      setDismissedIds(prev => new Set(prev).add(bill.id))
      router.refresh()
    } catch (err) {
      console.error('Error skipping bill:', err)
    }
    setProcessingId(null)
  }

  async function handleSkipIncome(income: IncomeEntry) {
    setProcessingId(income.id)
    try {
      if (income.next_pay_date && income.pay_frequency) {
        const nextDate = advanceDate(income.next_pay_date, income.pay_frequency)
        await supabase
          .from('income_entries')
          .update({ next_pay_date: nextDate })
          .eq('id', income.id)
      }
      setDismissedIds(prev => new Set(prev).add(income.id))
      router.refresh()
    } catch (err) {
      console.error('Error skipping income:', err)
    }
    setProcessingId(null)
  }

  // --- POSTPONE ---
  async function handlePostponeBill(bill: BillWithCategory, newDate: string) {
    setProcessingId(bill.id)
    try {
      await supabase
        .from('bills')
        .update({ next_due: newDate })
        .eq('id', bill.id)
      setDismissedIds(prev => new Set(prev).add(bill.id))
      setExpandedPostponeId(null)
      router.refresh()
    } catch (err) {
      console.error('Error postponing bill:', err)
    }
    setProcessingId(null)
  }

  async function handlePostponeIncome(income: IncomeEntry, newDate: string) {
    setProcessingId(income.id)
    try {
      await supabase
        .from('income_entries')
        .update({ next_pay_date: newDate })
        .eq('id', income.id)
      setDismissedIds(prev => new Set(prev).add(income.id))
      setExpandedPostponeId(null)
      router.refresh()
    } catch (err) {
      console.error('Error postponing income:', err)
    }
    setProcessingId(null)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-gray-900">Pending Confirmations</h2>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-bloom-600 hover:text-bloom-700 font-medium"
          >
            {expanded ? 'Show less' : `Show all (${allItems.length})`}
          </button>
        )}
      </div>

      <div className="card divide-y divide-gray-50">
        {visibleItems.map((item) => {
          const id = item.data.id
          const isProcessing = processingId === id
          const isBill = item.kind === 'bill'
          const bill = isBill ? item.data : null
          const income = !isBill ? item.data : null

          const name = isBill ? bill!.name : income!.source
          const dateStr = isBill ? bill!.next_due : income!.next_pay_date!
          const amount = isBill
            ? Number(bill!.amount)
            : incomeAmountForFrequency(Number(income!.amount), income!.pay_frequency)
          const category = isBill ? bill!.categories : null

          return (
            <div key={id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {category ? (
                    <CategoryChip
                      name={category.name}
                      color={category.color}
                      icon={category.icon}
                      size="sm"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-sprout-100 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-sprout-600" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{name}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={getDateClass(dateStr)}>
                        {getDateLabel(dateStr)}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-400">
                        {isBill ? 'Bill' : 'Income'}
                      </span>
                    </div>
                  </div>
                </div>
                <p className={`font-semibold shrink-0 ${isBill ? 'text-gray-900' : 'text-sprout-600'}`}>
                  {isBill ? '' : '+'}{formatCurrency(Math.round(amount * 100) / 100)}
                </p>
              </div>

              {/* Inline account picker for Confirm */}
              {expandedConfirmId === id && (
                <div className="mt-3 ml-11">
                  <p className="text-xs text-gray-500 mb-2">
                    {isBill ? 'Pay from:' : 'Deposit to:'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {bankAccounts.map(account => (
                      <button
                        key={account.id}
                        onClick={() => isBill
                          ? handleConfirmBill(bill!, account.id)
                          : handleConfirmIncome(income!, account.id)
                        }
                        disabled={isProcessing}
                        className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors"
                      >
                        {account.name}
                      </button>
                    ))}
                    {isBill && creditCards.map(card => (
                      <button
                        key={card.id}
                        onClick={() => handleConfirmBill(bill!, card.id)}
                        disabled={isProcessing}
                        className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors"
                      >
                        {card.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Inline date picker for Postpone */}
              {expandedPostponeId === id && (
                <div className="mt-3 ml-11 flex items-center gap-2">
                  <input
                    type="date"
                    value={postponeDate}
                    onChange={(e) => setPostponeDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                  />
                  <button
                    onClick={() => {
                      if (!postponeDate) return
                      if (isBill) handlePostponeBill(bill!, postponeDate)
                      else handlePostponeIncome(income!, postponeDate)
                    }}
                    disabled={isProcessing || !postponeDate}
                    className="text-xs px-3 py-1.5 bg-bloom-500 text-white rounded-full hover:bg-bloom-600 disabled:opacity-50 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setExpandedPostponeId(null)}
                    className="text-xs px-2 py-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Action buttons */}
              {expandedConfirmId !== id && expandedPostponeId !== id && (
                <div className="flex items-center gap-2 mt-3 ml-11">
                  <button
                    onClick={() => {
                      setExpandedConfirmId(id)
                      setExpandedPostponeId(null)
                    }}
                    disabled={isProcessing}
                    className="text-xs px-3 py-1.5 bg-bloom-500 text-white rounded-full hover:bg-bloom-600 disabled:opacity-50 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => isBill ? handleSkipBill(bill!) : handleSkipIncome(income!)}
                    disabled={isProcessing}
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => {
                      setExpandedPostponeId(id)
                      setExpandedConfirmId(null)
                      setPostponeDate('')
                    }}
                    disabled={isProcessing}
                    className="text-xs px-3 py-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
                  >
                    Postpone
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
