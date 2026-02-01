'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Wallet, Landmark, CreditCard, TrendingUp, Receipt, Info, LineChart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CurrencyInput } from '@/components/ui/currency-input'

type AccountType = 'bank' | 'cash' | 'investment' | 'credit_card' | 'loan'
type InvestmentType = 'shares' | 'super' | 'property' | 'crypto' | 'other'

const accountTypes = [
  { value: 'bank' as AccountType, label: 'Bank Account', icon: Landmark, isAsset: true, description: 'Everyday or savings account' },
  { value: 'cash' as AccountType, label: 'Cash', icon: Wallet, isAsset: true, description: 'Physical cash on hand' },
  { value: 'investment' as AccountType, label: 'Investment', icon: TrendingUp, isAsset: true, description: 'Shares, super, property' },
  { value: 'credit_card' as AccountType, label: 'Credit Card', icon: CreditCard, isAsset: false, description: 'Credit card balance' },
  { value: 'loan' as AccountType, label: 'Loan', icon: Receipt, isAsset: false, description: 'Personal, car, home loan' },
]

const investmentTypes = [
  { value: 'shares' as InvestmentType, label: 'Shares/Stocks', description: 'Individual stocks or ETFs' },
  { value: 'super' as InvestmentType, label: 'Superannuation', description: 'Retirement savings' },
  { value: 'property' as InvestmentType, label: 'Property', description: 'Investment property equity' },
  { value: 'crypto' as InvestmentType, label: 'Crypto', description: 'Cryptocurrency holdings' },
  { value: 'other' as InvestmentType, label: 'Other', description: 'Other investments' },
]

export default function NewAccountPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('bank')
  const [balance, setBalance] = useState('')
  const [institution, setInstitution] = useState('')

  // Investment specific
  const [investmentType, setInvestmentType] = useState<InvestmentType>('shares')

  // Loan/credit card specific fields
  const [interestRate, setInterestRate] = useState('')
  const [interestFreeDays, setInterestFreeDays] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [minimumPayment, setMinimumPayment] = useState('')
  const [originalAmount, setOriginalAmount] = useState('')
  const [payoffDate, setPayoffDate] = useState('')
  const [paymentFrequency, setPaymentFrequency] = useState<'weekly' | 'fortnightly' | 'monthly'>('monthly')

  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const selectedType = accountTypes.find(t => t.value === type)!
  const isCreditCard = type === 'credit_card'
  const isLoan = type === 'loan'
  const isInvestment = type === 'investment'
  const showDebtFields = isCreditCard || isLoan

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !balance) return

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('accounts').insert({
      user_id: user.id,
      name,
      type,
      balance: parseFloat(balance),
      is_asset: selectedType.isAsset,
      institution: institution || (isInvestment ? investmentType : null),
      interest_rate: interestRate ? parseFloat(interestRate) : null,
      interest_free_days: interestFreeDays ? parseInt(interestFreeDays) : null,
      due_date: dueDate ? parseInt(dueDate) : null,
      minimum_payment: minimumPayment ? parseFloat(minimumPayment) : null,
      original_amount: originalAmount ? parseFloat(originalAmount) : null,
      payoff_date: payoffDate || null,
      payment_frequency: showDebtFields ? paymentFrequency : null,
    })

    if (!error) {
      const { error: snapshotError } = await supabase.rpc('create_net_worth_snapshot', { p_user_id: user.id })
      if (snapshotError) {
        console.error('Error creating net worth snapshot:', snapshotError)
      }
      router.push('/net-worth')
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/net-worth" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <h1 className="font-display text-2xl font-bold text-gray-900">Add Account</h1>
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
                    type === t.value
                      ? 'border-bloom-500 bg-bloom-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${type === t.value ? 'text-bloom-600' : 'text-gray-400'}`} />
                  <p className={`text-sm font-medium ${type === t.value ? 'text-bloom-700' : 'text-gray-700'}`}>
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

        {/* Investment Type Selection */}
        {isInvestment && (
          <div>
            <label className="label">Investment Type</label>
            <div className="flex flex-wrap gap-2">
              {investmentTypes.map((inv) => (
                <button
                  key={inv.value}
                  type="button"
                  onClick={() => setInvestmentType(inv.value)}
                  className={`px-4 py-2 rounded-xl border-2 text-left transition-all ${
                    investmentType === inv.value
                      ? 'border-sprout-500 bg-sprout-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-sm font-medium ${investmentType === inv.value ? 'text-sprout-700' : 'text-gray-700'}`}>
                    {inv.label}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label">Account Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              isInvestment
                ? investmentType === 'shares'
                  ? 'e.g., Vanguard ETF, Tesla shares'
                  : investmentType === 'super'
                  ? 'e.g., Australian Super'
                  : investmentType === 'property'
                  ? 'e.g., Investment Property - Sydney'
                  : investmentType === 'crypto'
                  ? 'e.g., Bitcoin, Ethereum'
                  : 'e.g., My Investment'
                : isCreditCard
                ? 'e.g., Visa Platinum'
                : isLoan
                ? 'e.g., Car Loan'
                : 'e.g., Everyday Account'
            }
            className="input"
            required
          />
        </div>

        <div>
          <label className="label">
            {selectedType.isAsset ? 'Current Value' : 'Amount Owed'}
          </label>
          <CurrencyInput
            value={balance}
            onChange={setBalance}
            placeholder="0"
            required
          />
          {isInvestment && (
            <p className="text-xs text-gray-400 mt-1">
              Enter today&apos;s value. You can update this anytime from the account details.
            </p>
          )}
        </div>

        {!isInvestment && (
          <div>
            <label className="label">Institution (optional)</label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g., CommBank, ANZ"
              className="input"
            />
          </div>
        )}

        {/* Investment tracking info */}
        {isInvestment && (
          <div className="p-4 bg-sprout-50 rounded-xl">
            <div className="flex items-start gap-3">
              <LineChart className="w-5 h-5 text-sprout-600 mt-0.5" />
              <div>
                <p className="font-medium text-sprout-700">Track Your Portfolio</p>
                <p className="text-sm text-sprout-600 mt-1">
                  After adding, you can update the value anytime from the account details page.
                  Your net worth history will show how your investments change over time.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Credit Card & Loan specific fields */}
        {showDebtFields && (
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
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="e.g., 19.99"
                  className="input"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Annual interest rate - used to calculate interest charges
                </p>
              </div>

              {isCreditCard && (
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
        )}

        <button
          type="submit"
          disabled={loading || !name || !balance}
          className="btn-primary w-full"
        >
          {loading ? 'Adding...' : 'Add Account'}
        </button>
      </form>
    </div>
  )
}
