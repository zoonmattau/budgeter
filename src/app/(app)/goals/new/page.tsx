'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, Plane, Car, Home, Gift, GraduationCap, CreditCard, Wallet } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CurrencyInput } from '@/components/ui/currency-input'
import { formatCurrency } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'

const goalTemplates = [
  { name: 'Emergency Fund', icon: Sparkles, color: '#d946ef', target: 10000 },
  { name: 'Holiday', icon: Plane, color: '#3b82f6', target: 5000 },
  { name: 'New Car', icon: Car, color: '#22c55e', target: 15000 },
  { name: 'Home Deposit', icon: Home, color: '#f97316', target: 50000 },
  { name: 'Gift', icon: Gift, color: '#ec4899', target: 500 },
  { name: 'Education', icon: GraduationCap, color: '#8b5cf6', target: 3000 },
]

type GoalType = 'savings' | 'debt_payoff'

export default function NewGoalPage() {
  const router = useRouter()
  const [goalType, setGoalType] = useState<GoalType>('savings')
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<typeof goalTemplates[0] | null>(null)
  const [loading, setLoading] = useState(false)

  // Debt payoff specific state
  const [debtAccounts, setDebtAccounts] = useState<Tables<'accounts'>[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  const supabase = createClient()

  // Fetch debt accounts when goal type changes to debt_payoff
  useEffect(() => {
    if (goalType === 'debt_payoff') {
      fetchDebtAccounts()
    }
  }, [goalType])

  async function fetchDebtAccounts() {
    setLoadingAccounts(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: accounts } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_asset', false)
      .gt('balance', 0)
      .order('balance', { ascending: false })

    setDebtAccounts(accounts || [])
    setLoadingAccounts(false)
  }

  function handleTemplateSelect(template: typeof goalTemplates[0]) {
    setSelectedTemplate(template)
    setName(template.name)
    setTargetAmount(template.target.toString())
  }

  function handleAccountSelect(accountId: string) {
    setSelectedAccountId(accountId)
    const account = debtAccounts.find(a => a.id === accountId)
    if (account) {
      setName(`Pay off ${account.name}`)
      setTargetAmount(account.balance.toString())
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !targetAmount) return
    if (goalType === 'debt_payoff' && !selectedAccountId) return

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const selectedAccount = debtAccounts.find(a => a.id === selectedAccountId)

    const { error } = await supabase.from('goals').insert({
      user_id: user.id,
      name,
      target_amount: parseFloat(targetAmount),
      current_amount: 0,
      deadline: deadline || null,
      icon: goalType === 'debt_payoff' ? 'credit-card' : 'target',
      color: goalType === 'debt_payoff' ? '#ef4444' : (selectedTemplate?.color || '#d946ef'),
      visual_type: 'plant',
      goal_type: goalType,
      linked_account_id: goalType === 'debt_payoff' ? selectedAccountId : null,
    })

    if (!error) {
      router.push('/goals')
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/goals" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <h1 className="font-display text-2xl font-bold text-gray-900">New Goal</h1>
      </div>

      {/* Goal Type Selector */}
      <div>
        <p className="text-sm text-gray-500 mb-3">What type of goal?</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setGoalType('savings')
              setName('')
              setTargetAmount('')
              setSelectedAccountId('')
              setSelectedTemplate(null)
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              goalType === 'savings'
                ? 'border-bloom-500 bg-bloom-50'
                : 'border-gray-100 hover:border-gray-200 bg-white'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-sprout-100 flex items-center justify-center mb-2">
              <Wallet className="w-5 h-5 text-sprout-600" />
            </div>
            <p className="font-semibold text-gray-900">Save Money</p>
            <p className="text-xs text-gray-500 mt-1">Save towards a goal</p>
          </button>

          <button
            onClick={() => {
              setGoalType('debt_payoff')
              setName('')
              setTargetAmount('')
              setSelectedTemplate(null)
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              goalType === 'debt_payoff'
                ? 'border-bloom-500 bg-bloom-50'
                : 'border-gray-100 hover:border-gray-200 bg-white'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center mb-2">
              <CreditCard className="w-5 h-5 text-red-600" />
            </div>
            <p className="font-semibold text-gray-900">Pay Off Debt</p>
            <p className="text-xs text-gray-500 mt-1">Track debt repayment</p>
          </button>
        </div>
      </div>

      {/* Savings Goal Form */}
      {goalType === 'savings' && (
        <>
          {/* Templates */}
          <div>
            <p className="text-sm text-gray-500 mb-3">Quick start with a template</p>
            <div className="grid grid-cols-3 gap-2">
              {goalTemplates.map((template) => {
                const Icon = template.icon
                const isSelected = selectedTemplate?.name === template.name
                return (
                  <button
                    key={template.name}
                    onClick={() => handleTemplateSelect(template)}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      isSelected
                        ? 'border-bloom-500 bg-bloom-50'
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                      style={{ backgroundColor: `${template.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: template.color }} />
                    </div>
                    <p className="text-xs font-medium text-gray-700 truncate">{template.name}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Goal Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="What are you saving for?"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Target Amount</label>
                <CurrencyInput
                  value={targetAmount}
                  onChange={setTargetAmount}
                  placeholder="10,000"
                  required
                />
              </div>

              <div>
                <label className="label">Target Date (optional)</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Setting a deadline helps us track if you&apos;re on pace
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !name || !targetAmount}
                className="btn-primary w-full"
              >
                {loading ? 'Creating...' : 'Create Goal'}
              </button>
            </form>
          </div>
        </>
      )}

      {/* Debt Payoff Form */}
      {goalType === 'debt_payoff' && (
        <div className="border-t border-gray-100 pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account Selection */}
            <div>
              <label className="label">Select Debt to Pay Off</label>
              {loadingAccounts ? (
                <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-500">
                  Loading accounts...
                </div>
              ) : debtAccounts.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-xl text-center">
                  <p className="text-amber-700 text-sm">No debt accounts found.</p>
                  <p className="text-amber-600 text-xs mt-1">
                    Add a credit card or loan in Net Worth first.
                  </p>
                  <Link href="/net-worth/new" className="btn-secondary mt-3 inline-flex text-sm">
                    Add Account
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {debtAccounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => handleAccountSelect(account.id)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center justify-between ${
                        selectedAccountId === account.id
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{account.name}</p>
                          <p className="text-xs text-gray-500">
                            {account.type === 'credit_card' ? 'Credit Card' :
                             account.type === 'loan' ? 'Loan' : 'Debt'}
                            {account.institution && ` • ${account.institution}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">{formatCurrency(account.balance)}</p>
                        <p className="text-xs text-gray-400">owing</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedAccountId && (
              <>
                <div>
                  <label className="label">Goal Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Pay off credit card"
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">Amount to Pay Off</label>
                  <CurrencyInput
                    value={targetAmount}
                    onChange={setTargetAmount}
                    placeholder="5,000"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Pre-filled with your current balance
                  </p>
                </div>

                <div>
                  <label className="label">Target Date (optional)</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="input"
                  />
                </div>

                <div className="p-4 bg-sprout-50 rounded-xl">
                  <p className="text-sm text-sprout-700">
                    <strong>Auto-completion:</strong> This goal will automatically be marked as complete when your {debtAccounts.find(a => a.id === selectedAccountId)?.name} balance reaches $0.
                  </p>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading || !name || !targetAmount || !selectedAccountId}
              className="btn-primary w-full"
            >
              {loading ? 'Creating...' : 'Create Goal'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
