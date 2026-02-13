'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, Plane, Car, Home, Gift, GraduationCap, CreditCard, Wallet, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { CurrencyInput } from '@/components/ui/currency-input'
import { formatCurrency } from '@/lib/utils'
import { calculateMilestoneInfo } from '@/lib/net-worth-calculations'
import { LikelihoodBadge } from '@/components/goals/likelihood-badge'
import type { Tables } from '@/lib/database.types'

const goalTemplates = [
  { name: 'Emergency Fund', icon: Sparkles, color: '#d946ef', target: 10000 },
  { name: 'Holiday', icon: Plane, color: '#3b82f6', target: 5000 },
  { name: 'New Car', icon: Car, color: '#22c55e', target: 15000 },
  { name: 'Home Deposit', icon: Home, color: '#f97316', target: 50000 },
  { name: 'Gift', icon: Gift, color: '#ec4899', target: 500 },
  { name: 'Education', icon: GraduationCap, color: '#8b5cf6', target: 3000 },
]

type GoalType = 'savings' | 'debt_payoff' | 'net_worth_milestone'

interface NewGoalFormProps {
  debtAccounts: Tables<'accounts'>[]
  currentNetWorth: number
  avgMonthlyGrowth: number
}

export function NewGoalForm({ debtAccounts, currentNetWorth, avgMonthlyGrowth }: NewGoalFormProps) {
  const router = useRouter()
  const [goalType, setGoalType] = useState<GoalType>('savings')
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<typeof goalTemplates[0] | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')

  const supabase = createClient()

  const milestonePreview = useMemo(() => {
    if (targetAmount === '' || targetAmount === undefined) return null
    const target = parseFloat(targetAmount)
    if (isNaN(target) || target < 0) return null
    return calculateMilestoneInfo(currentNetWorth, target, avgMonthlyGrowth, deadline || null)
  }, [currentNetWorth, targetAmount, avgMonthlyGrowth, deadline])

  // Compute dates that correspond to 25%, 50%, 75%, 99% chance
  // Formula: pct = round((avgMonthlyGrowth / (remaining / months)) * 85)
  // Solve: months = (pct / 85) * remaining / avgMonthlyGrowth
  const quickDates = useMemo(() => {
    if (targetAmount === '' || targetAmount === undefined) return null
    const target = parseFloat(targetAmount)
    if (isNaN(target) || target < 0) return null
    const remaining = target - currentNetWorth
    if (remaining <= 0 || avgMonthlyGrowth <= 0) return null

    const percentages = [25, 50, 75, 99] as const
    const now = new Date()
    const results: { pct: number; date: Date; dateStr: string }[] = []

    for (const pct of percentages) {
      const months = Math.ceil((pct / 85) * remaining / avgMonthlyGrowth)
      if (months > 0 && months <= 600) {
        // Use last day of the target month so the full month counts in the calculation
        const d = new Date(now.getFullYear(), now.getMonth() + months + 1, 0)
        results.push({
          pct,
          date: d,
          dateStr: d.toISOString().split('T')[0],
        })
      }
    }

    return results.length > 0 ? results : null
  }, [targetAmount, currentNetWorth, avgMonthlyGrowth])

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

    const { error } = await supabase.from('goals').insert({
      user_id: user.id,
      name,
      target_amount: parseFloat(targetAmount),
      current_amount: 0,
      deadline: deadline || null,
      icon: goalType === 'debt_payoff' ? 'credit-card' : goalType === 'net_worth_milestone' ? 'trending-up' : 'target',
      color: goalType === 'debt_payoff' ? '#ef4444' : goalType === 'net_worth_milestone' ? '#3b82f6' : (selectedTemplate?.color || '#d946ef'),
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
        <div className="grid grid-cols-3 gap-3">
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
            <p className="font-semibold text-gray-900 text-sm">Save Money</p>
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
            <p className="font-semibold text-gray-900 text-sm">Pay Off Debt</p>
            <p className="text-xs text-gray-500 mt-1">Track debt repayment</p>
          </button>

          <button
            onClick={() => {
              setGoalType('net_worth_milestone')
              setName('')
              setTargetAmount('')
              setSelectedAccountId('')
              setSelectedTemplate(null)
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              goalType === 'net_worth_milestone'
                ? 'border-bloom-500 bg-bloom-50'
                : 'border-gray-100 hover:border-gray-200 bg-white'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="font-semibold text-gray-900 text-sm">Net Worth</p>
            <p className="text-xs text-gray-500 mt-1">Hit a milestone</p>
          </button>
        </div>
      </div>

      {/* Savings Goal Form */}
      {goalType === 'savings' && (
        <>
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
            <div>
              <label className="label">Select Debt to Pay Off</label>
              {debtAccounts.length === 0 ? (
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

      {/* Net Worth Milestone Form */}
      {goalType === 'net_worth_milestone' && (
        <div className="border-t border-gray-100 pt-6">
          {/* Milestone Presets */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-3">Pick a milestone or set your own</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Debt-free', amount: 0 },
                { label: '$10k', amount: 10000 },
                { label: '$25k', amount: 25000 },
                { label: '$50k', amount: 50000 },
                { label: '$100k', amount: 100000 },
                { label: '$250k', amount: 250000 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setName(preset.amount === 0 ? 'Become Debt-Free' : `Reach ${preset.label} Net Worth`)
                    setTargetAmount(preset.amount.toString())
                  }}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    targetAmount === preset.amount.toString()
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <p className="text-sm font-bold text-gray-900">{preset.label}</p>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Goal Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Reach $100k Net Worth"
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Target Net Worth</label>
              <CurrencyInput
                value={targetAmount}
                onChange={setTargetAmount}
                placeholder="100,000"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                The net worth amount you want to reach
              </p>
            </div>

            {/* No budget prompt */}
            {avgMonthlyGrowth === 0 && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-sm font-medium text-amber-800 mb-1">No budget data found</p>
                <p className="text-xs text-amber-700 mb-3">
                  Set up your budget so we can project when you&apos;ll hit this milestone and show your chances of success.
                </p>
                <Link href="/budget" className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800 hover:text-amber-900 transition-colors">
                  Go to Budget
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                </Link>
              </div>
            )}

            {/* Suggested date */}
            {milestonePreview?.suggestedDate && !deadline && (
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-700 mb-2">
                  Based on your +{formatCurrency(avgMonthlyGrowth)}/mo growth, we suggest targeting:
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(milestonePreview.suggestedDate!)
                    setDeadline(d.toISOString().split('T')[0])
                  }}
                  className="w-full p-3 bg-white rounded-xl border-2 border-blue-300 hover:border-blue-500 transition-colors text-center"
                >
                  <p className="text-lg font-bold text-blue-700">
                    {format(new Date(milestonePreview.suggestedDate), 'MMMM yyyy')}
                  </p>
                  <p className="text-xs text-blue-500 mt-0.5">Tap to set as your target date</p>
                </button>
              </div>
            )}

            {/* Quick date buttons for target percentages */}
            {quickDates && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Quick pick a target date</p>
                <div className="grid grid-cols-4 gap-2">
                  {quickDates.map(({ pct, date, dateStr }) => {
                    const isSelected = deadline === dateStr
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setDeadline(dateStr)}
                        className={`p-2.5 rounded-xl border-2 transition-all text-center ${
                          isSelected
                            ? pct >= 75 ? 'border-sprout-500 bg-sprout-50' :
                              pct >= 50 ? 'border-amber-500 bg-amber-50' : 'border-red-500 bg-red-50'
                            : 'border-gray-100 hover:border-gray-200 bg-white'
                        }`}
                      >
                        <p className={`text-lg font-bold ${
                          pct >= 75 ? 'text-sprout-600' :
                          pct >= 50 ? 'text-amber-600' : 'text-red-600'
                        }`}>{pct}%</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {format(date, 'MMM yyyy')}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="label">Target Date {!deadline && '(optional)'}</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="input"
              />
              {!deadline && (
                <p className="text-xs text-gray-400 mt-1">
                  Set a date to see your percentage chance of hitting it
                </p>
              )}
            </div>

            {/* Percentage chance — shows as soon as a deadline is picked */}
            {deadline && (
              <div className={`p-5 rounded-xl text-center ${
                milestonePreview && milestonePreview.percentageChance !== null && milestonePreview.percentageChance !== undefined
                  ? milestonePreview.percentageChance >= 75 ? 'bg-sprout-50' :
                    milestonePreview.percentageChance >= 40 ? 'bg-amber-50' : 'bg-red-50'
                  : 'bg-gray-50'
              }`}>
                {milestonePreview && milestonePreview.percentageChance !== null && milestonePreview.percentageChance !== undefined ? (
                  <>
                    <p className={`text-5xl font-bold ${
                      milestonePreview.percentageChance >= 75 ? 'text-sprout-600' :
                      milestonePreview.percentageChance >= 40 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {milestonePreview.percentageChance}%
                    </p>
                    <p className={`text-sm font-medium mt-1 ${
                      milestonePreview.percentageChance >= 75 ? 'text-sprout-700' :
                      milestonePreview.percentageChance >= 40 ? 'text-amber-700' : 'text-red-700'
                    }`}>
                      chance of hitting this by {format(new Date(deadline), 'MMM yyyy')}
                    </p>
                    {milestonePreview.requiredMonthlyGrowth !== null && milestonePreview.requiredMonthlyGrowth > 0 && avgMonthlyGrowth > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Needs +{formatCurrency(milestonePreview.requiredMonthlyGrowth)}/mo &middot; You&apos;re averaging +{formatCurrency(avgMonthlyGrowth)}/mo
                      </p>
                    )}
                    {avgMonthlyGrowth === 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Set up your budget to improve this estimate
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    {!targetAmount ? 'Enter a target amount to see your chances' : 'Enter a valid target amount to see your chances'}
                  </p>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-blue-700">Current net worth</span>
                <span className={`font-bold ${currentNetWorth >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                  {formatCurrency(currentNetWorth)}
                </span>
              </div>
              {avgMonthlyGrowth !== 0 && milestonePreview && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-white/60 rounded-lg p-2.5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Your Growth</p>
                    <p className={`text-sm font-bold ${avgMonthlyGrowth >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                      {avgMonthlyGrowth >= 0 ? '+' : ''}{formatCurrency(avgMonthlyGrowth)}/mo
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2.5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Est. Arrival</p>
                    <p className="text-sm font-bold text-blue-700">
                      {milestonePreview.estimatedArrival
                        ? format(new Date(milestonePreview.estimatedArrival), 'MMM yyyy')
                        : avgMonthlyGrowth <= 0 ? 'N/A' : '5+ years'}
                    </p>
                  </div>
                </div>
              )}
              {avgMonthlyGrowth === 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  Set up your budget to see growth projections and target dates.
                </p>
              )}
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
      )}
    </div>
  )
}
