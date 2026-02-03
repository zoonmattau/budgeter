'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Wallet, Landmark, CreditCard, TrendingUp, Receipt, Trash2, Info, LineChart, AlertCircle, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CurrencyInput } from '@/components/ui/currency-input'
import { AccountLogo } from '@/components/ui/account-logo'
import { getBankLogo } from '@/lib/bank-logos'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { calculateInterestDue, formatInterestDescription, getInterestAppliedDate } from '@/lib/interest-calculator'
import type { Tables } from '@/lib/database.types'

type AccountType = 'bank' | 'cash' | 'investment' | 'credit' | 'credit_card' | 'debt' | 'loan'

const accountTypes = [
  { value: 'bank' as AccountType, label: 'Bank Account', icon: Landmark, isAsset: true, description: 'Everyday or savings account' },
  { value: 'cash' as AccountType, label: 'Cash', icon: Wallet, isAsset: true, description: 'Physical cash on hand' },
  { value: 'investment' as AccountType, label: 'Investment', icon: TrendingUp, isAsset: true, description: 'Shares, super, property' },
  { value: 'credit_card' as AccountType, label: 'Credit Card', icon: CreditCard, isAsset: false, description: 'Credit card balance' },
  { value: 'loan' as AccountType, label: 'Loan', icon: Receipt, isAsset: false, description: 'Personal, car, home loan' },
]

interface EditAccountFormProps {
  account: Tables<'accounts'>
}

export function EditAccountForm({ account }: EditAccountFormProps) {
  const router = useRouter()

  // Map old types to new types
  const mappedType = account.type === 'credit' ? 'credit_card' : account.type === 'debt' ? 'loan' : account.type

  const [name, setName] = useState(account.name)
  const [type, setType] = useState<AccountType>(mappedType as AccountType)
  const [balance, setBalance] = useState(String(account.balance))
  const [institution, setInstitution] = useState(account.institution || '')

  // Loan/credit card specific fields
  const [interestRate, setInterestRate] = useState(account.interest_rate ? String(account.interest_rate) : '')
  const [interestFreeDays, setInterestFreeDays] = useState(account.interest_free_days ? String(account.interest_free_days) : '')
  const [creditLimit, setCreditLimit] = useState(account.credit_limit ? String(account.credit_limit) : '')
  const [dueDate, setDueDate] = useState(account.due_date ? String(account.due_date) : '')
  const [minimumPayment, setMinimumPayment] = useState(account.minimum_payment ? String(account.minimum_payment) : '')
  const [originalAmount, setOriginalAmount] = useState(account.original_amount ? String(account.original_amount) : '')
  const [payoffDate, setPayoffDate] = useState(account.payoff_date || '')
  const [paymentFrequency, setPaymentFrequency] = useState<'weekly' | 'fortnightly' | 'monthly'>(
    account.payment_frequency || 'monthly'
  )

  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [applyingInterest, setApplyingInterest] = useState(false)

  const supabase = createClient()

  // Calculate pending interest for loans
  const interestDue = calculateInterestDue(account)

  const selectedType = accountTypes.find(t => t.value === type) || accountTypes[0]
  const isCreditCard = type === 'credit_card' || type === 'credit'
  const isLoan = type === 'loan' || type === 'debt'
  const isInvestment = type === 'investment'
  const showDebtFields = isCreditCard || isLoan

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !balance) return

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('accounts')
      .update({
        name,
        type,
        balance: parseFloat(balance),
        is_asset: selectedType.isAsset,
        institution: institution || null,
        interest_rate: interestRate ? parseFloat(interestRate) : null,
        interest_free_days: interestFreeDays ? parseInt(interestFreeDays) : null,
        credit_limit: creditLimit ? parseFloat(creditLimit) : null,
        due_date: dueDate ? parseInt(dueDate) : null,
        minimum_payment: minimumPayment ? parseFloat(minimumPayment) : null,
        original_amount: originalAmount ? parseFloat(originalAmount) : null,
        payoff_date: payoffDate || null,
        payment_frequency: showDebtFields ? paymentFrequency : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)

    if (!error) {
      // Create/update net worth snapshot
      const { error: snapshotError } = await supabase.rpc('create_net_worth_snapshot', { p_user_id: user.id })
      if (snapshotError) {
        console.error('Error creating net worth snapshot:', snapshotError)
      }

      router.push('/net-worth')
      router.refresh()
    }

    setLoading(false)
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${account.name}"? This action cannot be undone.`
    )

    if (!confirmed) return

    setDeleting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', account.id)

    if (!error) {
      // Create/update net worth snapshot after deletion
      const { error: snapshotError } = await supabase.rpc('create_net_worth_snapshot', { p_user_id: user.id })
      if (snapshotError) {
        console.error('Error creating net worth snapshot:', snapshotError)
      }

      router.push('/net-worth')
      router.refresh()
    }

    setDeleting(false)
  }

  async function handleApplyInterest() {
    if (!interestDue.shouldApply) return

    setApplyingInterest(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newInterestAppliedDate = getInterestAppliedDate(account, interestDue.periodsToApply)

    const { error } = await supabase
      .from('accounts')
      .update({
        balance: interestDue.newBalance,
        interest_last_applied: newInterestAppliedDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)

    if (!error) {
      // Update local state
      setBalance(String(interestDue.newBalance))

      // Create net worth snapshot
      await supabase.rpc('create_net_worth_snapshot', { p_user_id: user.id })

      router.refresh()
    }

    setApplyingInterest(false)
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <Link href="/net-worth" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <h1 className="font-display text-2xl font-bold text-gray-900">Edit Account</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Account Type</label>
          <div className="grid grid-cols-2 gap-2">
            {accountTypes.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    type === t.value || (t.value === 'credit_card' && type === 'credit') || (t.value === 'loan' && type === 'debt')
                      ? 'border-bloom-500 bg-bloom-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${type === t.value || (t.value === 'credit_card' && type === 'credit') || (t.value === 'loan' && type === 'debt') ? 'text-bloom-600' : 'text-gray-400'}`} />
                  <p className={`text-sm font-medium ${type === t.value || (t.value === 'credit_card' && type === 'credit') || (t.value === 'loan' && type === 'debt') ? 'text-bloom-700' : 'text-gray-700'}`}>
                    {t.label}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="label">Account Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isCreditCard ? 'e.g., Visa Platinum' : isLoan ? 'e.g., Car Loan' : 'e.g., Everyday Account'}
            className="input"
            required
          />
        </div>

        <div>
          <label className="label">
            {isInvestment ? 'Current Value' : selectedType.isAsset ? 'Current Balance' : 'Amount Owed'}
          </label>
          <CurrencyInput
            value={balance}
            onChange={setBalance}
            placeholder="0"
            required
            isNegative={!selectedType.isAsset}
          />
          {isInvestment && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {format(new Date(account.updated_at), 'MMM d, yyyy')}
            </p>
          )}
          {!selectedType.isAsset && (
            <p className="text-xs text-gray-400 mt-1">
              This amount will count against your net worth
            </p>
          )}
        </div>

        {/* Investment value update prompt */}
        {isInvestment && (
          <div className="p-4 bg-sprout-50 rounded-xl">
            <div className="flex items-start gap-3">
              <LineChart className="w-5 h-5 text-sprout-600 mt-0.5" />
              <div>
                <p className="font-medium text-sprout-700">Update Your Portfolio Value</p>
                <p className="text-sm text-sprout-600 mt-1">
                  Enter today&apos;s value to keep your net worth accurate. Regular updates help you track performance over time.
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="label">Institution (optional)</label>
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g., CommBank, ANZ"
                className="input"
              />
            </div>
            {getBankLogo(institution) && (
              <AccountLogo
                institution={institution}
                type={type}
                size="lg"
              />
            )}
          </div>
          {institution && !getBankLogo(institution) && (
            <p className="text-xs text-gray-400 mt-1">
              No logo found - a default icon will be used
            </p>
          )}
        </div>

        {/* Credit Card & Loan specific fields */}
        {/* Pending Interest Alert for Loans */}
        {isLoan && interestDue.shouldApply && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-amber-800">Interest Due</p>
                <p className="text-sm text-amber-700 mt-1">
                  {formatInterestDescription(account, interestDue)}
                </p>
                <div className="mt-3 p-3 bg-white rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current Balance</span>
                    <span className="font-medium">{formatCurrency(account.balance)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Interest ({interestDue.periodsToApply} {interestDue.periodsToApply === 1 ? 'period' : 'periods'})</span>
                    <span className="font-medium text-amber-600">+{formatCurrency(interestDue.interestAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-100">
                    <span className="text-gray-700 font-medium">New Balance</span>
                    <span className="font-semibold">{formatCurrency(interestDue.newBalance)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleApplyInterest}
                  disabled={applyingInterest}
                  className="mt-3 w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {applyingInterest ? 'Applying Interest...' : 'Apply Interest to Balance'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showDebtFields && (
          <>
            <div className="border-t border-gray-100 pt-5">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-bloom-500" />
                <p className="text-sm font-medium text-gray-700">
                  {isCreditCard ? 'Credit Card Details' : 'Loan Details'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Interest Rate (% p.a.)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      placeholder="e.g., 19.99"
                      className="input pr-10"
                    />
                    {interestRate && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Annual interest rate - used to calculate interest charges
                  </p>
                </div>

                {isCreditCard && (
                  <>
                    <div>
                      <label className="label">Credit Limit</label>
                      <CurrencyInput
                        value={creditLimit}
                        onChange={setCreditLimit}
                        placeholder="e.g., 10000"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Your maximum credit limit - we&apos;ll warn you when approaching it
                      </p>
                    </div>
                    <div>
                      <label className="label">Interest-Free Period (days)</label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={interestFreeDays}
                        onChange={(e) => setInterestFreeDays(e.target.value)}
                        placeholder="e.g., 55"
                        className="input"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Days before interest is charged on purchases
                      </p>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Due Day of Month</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      placeholder="e.g., 15"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Minimum Payment</label>
                    <CurrencyInput
                      value={minimumPayment}
                      onChange={setMinimumPayment}
                      placeholder="0"
                    />
                  </div>
                </div>

                {isLoan && (
                  <>
                    <div>
                      <label className="label">Original Loan Amount</label>
                      <CurrencyInput
                        value={originalAmount}
                        onChange={setOriginalAmount}
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        The amount originally borrowed
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Payoff Date</label>
                        <input
                          type="date"
                          value={payoffDate}
                          onChange={(e) => setPayoffDate(e.target.value)}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">Payment Frequency</label>
                        <select
                          value={paymentFrequency}
                          onChange={(e) => setPaymentFrequency(e.target.value as 'weekly' | 'fortnightly' | 'monthly')}
                          className="input"
                        >
                          <option value="weekly">Weekly</option>
                          <option value="fortnightly">Fortnightly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading || !name || !balance}
          className="btn-primary w-full"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <div className="pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="w-full py-3 px-4 rounded-xl text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? 'Deleting...' : 'Delete Account'}
        </button>
      </div>
    </>
  )
}
