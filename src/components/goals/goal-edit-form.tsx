'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2, Plus, CreditCard, CheckCircle2, Users, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { LikelihoodBadge } from './likelihood-badge'
import type { MilestoneInfo } from '@/lib/net-worth-calculations'
import { createClient } from '@/lib/supabase/client'
import { CurrencyInput } from '@/components/ui/currency-input'
import { formatCurrency, getDebtPayoffMetrics } from '@/lib/utils'
import { PlantVisual } from './plant-visual'
import type { Tables } from '@/lib/database.types'

interface Contribution {
  user_id: string
  total: number
  display_name: string | null
}

interface GoalEditFormProps {
  goal: Tables<'goals'>
  linkedAccount: Tables<'accounts'> | null
  isHouseholdGoal?: boolean
  contributions?: Contribution[]
  currentUserId?: string
  milestoneInfo?: MilestoneInfo
}

export function GoalEditForm({ goal, linkedAccount, isHouseholdGoal, contributions = [], currentUserId, milestoneInfo }: GoalEditFormProps) {
  const router = useRouter()
  const [name, setName] = useState(goal.name)
  const [targetAmount, setTargetAmount] = useState(String(goal.target_amount))
  const [currentAmount, setCurrentAmount] = useState(String(goal.current_amount))
  const [deadline, setDeadline] = useState(goal.deadline || '')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startingAmount, setStartingAmount] = useState(String(goal.starting_amount ?? 0))
  const [addAmount, setAddAmount] = useState('')
  const [showAddFunds, setShowAddFunds] = useState(false)

  const supabase = createClient()

  const isDebtPayoff = goal.goal_type === 'debt_payoff'
  const isNetWorthMilestone = goal.goal_type === 'net_worth_milestone'
  const startVal = Number(startingAmount) || 0
  const debtMetrics = isDebtPayoff
    ? getDebtPayoffMetrics(Number(targetAmount), Number(currentAmount), startVal)
    : null
  const progress = isDebtPayoff
    ? (debtMetrics?.progress || 0)
    : Number(goal.target_amount) !== startVal
    ? ((Number(currentAmount) - startVal) / (Number(goal.target_amount) - startVal)) * 100
    : (Number(currentAmount) >= Number(goal.target_amount) ? 100 : 0)
  const isCompleted = goal.status === 'completed' || (isDebtPayoff && (debtMetrics?.remainingDebt || 0) <= 0.01)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !targetAmount) return

    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('goals')
      .update({
        name,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount),
        starting_amount: parseFloat(startingAmount) || 0,
        deadline: deadline || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goal.id)

    if (updateError) {
      setError('Failed to update goal. Please try again.')
      setLoading(false)
      return
    }

    router.push('/goals')
    router.refresh()
  }

  async function handleAddFunds() {
    if (!addAmount || parseFloat(addAmount) <= 0) return

    setLoading(true)
    const amountToAdd = parseFloat(addAmount)
    const newAmount = parseFloat(currentAmount) + amountToAdd

    // Get current user for contribution tracking
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // Create contribution record
    const { error: contribError } = await supabase
      .from('goal_contributions')
      .insert({
        goal_id: goal.id,
        user_id: user.id,
        amount: amountToAdd,
        source: 'manual',
        date: new Date().toISOString().split('T')[0],
      })

    if (contribError) {
      console.error('Error creating contribution:', contribError)
      // Fall back to just updating the goal directly
      const { error: updateError } = await supabase
        .from('goals')
        .update({
          current_amount: newAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goal.id)

      if (!updateError) {
        setCurrentAmount(String(newAmount))
        setAddAmount('')
        setShowAddFunds(false)
      }
    } else {
      // Contribution created - the trigger should update the goal
      setCurrentAmount(String(newAmount))
      setAddAmount('')
      setShowAddFunds(false)
      router.refresh()
    }

    setLoading(false)
  }

  async function handleMarkComplete() {
    setLoading(true)

    const { error: updateError } = await supabase
      .from('goals')
      .update({
        status: 'completed',
        current_amount: parseFloat(targetAmount),
        updated_at: new Date().toISOString(),
      })
      .eq('id', goal.id)

    if (!updateError) {
      router.push('/goals')
      router.refresh()
    }

    setLoading(false)
  }

  async function handleReactivate() {
    setLoading(true)

    const { error: updateError } = await supabase
      .from('goals')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', goal.id)

    if (!updateError) {
      router.refresh()
    }

    setLoading(false)
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${goal.name}"? This action cannot be undone.`
    )

    if (!confirmed) return

    setDeleting(true)

    const { error: deleteError } = await supabase
      .from('goals')
      .delete()
      .eq('id', goal.id)

    if (!deleteError) {
      router.push('/goals')
      router.refresh()
    }

    setDeleting(false)
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <Link href="/goals" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <h1 className="font-display text-2xl font-bold text-gray-900">
          {isCompleted ? 'Completed Goal' : 'Edit Goal'}
        </h1>
      </div>

      {/* Progress Card */}
      <div className={`card ${isDebtPayoff ? 'bg-gradient-to-br from-red-50 to-coral-50' : isNetWorthMilestone ? 'bg-gradient-to-br from-blue-50 to-indigo-50' : 'bg-gradient-to-br from-sprout-50 to-bloom-50'}`}>
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {isDebtPayoff ? (
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${isCompleted ? 'bg-sprout-100' : 'bg-red-100'}`}>
                {isCompleted ? (
                  <CheckCircle2 className="w-10 h-10 text-sprout-600" />
                ) : (
                  <CreditCard className="w-10 h-10 text-red-500" />
                )}
              </div>
            ) : isNetWorthMilestone ? (
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${isCompleted ? 'bg-sprout-100' : 'bg-blue-100'}`}>
                {isCompleted ? (
                  <CheckCircle2 className="w-10 h-10 text-sprout-600" />
                ) : (
                  <TrendingUp className="w-10 h-10 text-blue-500" />
                )}
              </div>
            ) : (
              <PlantVisual progress={progress} size="lg" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="font-display text-lg font-semibold text-gray-900">{goal.name}</h2>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold ${isDebtPayoff ? 'text-red-600' : isNetWorthMilestone ? 'text-blue-600' : 'text-bloom-600'}`}>
                {isDebtPayoff ? formatCurrency(debtMetrics?.remainingDebt || 0) : formatCurrency(currentAmount)}
              </span>
              {isDebtPayoff ? (
                <span className="text-gray-400 text-sm">remaining</span>
              ) : (
                <>
                  <span className="text-gray-400">of</span>
                  <span className="text-gray-600 font-medium">{formatCurrency(targetAmount)}</span>
                </>
              )}
            </div>
            {startVal !== 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                Started at {formatCurrency(startVal)}
                {Number(currentAmount) !== startVal && (
                  <span className={Number(currentAmount) >= startVal ? 'text-blue-500 ml-2' : 'text-red-500 ml-2'}>
                    {Number(currentAmount) >= startVal ? '+' : ''}{formatCurrency(Number(currentAmount) - startVal)} from start
                  </span>
                )}
              </p>
            )}
            <div className="h-2 bg-white/50 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all ${isDebtPayoff ? 'bg-red-500' : isNetWorthMilestone ? 'bg-blue-500' : 'bg-sprout-500'}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">{Math.round(progress)}% {isDebtPayoff ? 'paid off' : 'complete'}</p>
          </div>
        </div>

        {/* Milestone projection info */}
        {isNetWorthMilestone && !isCompleted && milestoneInfo && (
          <div className="mt-4 pt-4 border-t border-white/30 space-y-3">
            {/* Big percentage chance when deadline is set */}
            {milestoneInfo.percentageChance !== null && goal.deadline && (
              <div className={`rounded-xl p-4 text-center ${
                milestoneInfo.percentageChance >= 75 ? 'bg-sprout-100/60' :
                milestoneInfo.percentageChance >= 40 ? 'bg-amber-100/60' : 'bg-red-100/60'
              }`}>
                <p className={`text-4xl font-bold ${
                  milestoneInfo.percentageChance >= 75 ? 'text-sprout-600' :
                  milestoneInfo.percentageChance >= 40 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {milestoneInfo.percentageChance}%
                </p>
                <p className="text-sm text-gray-600 mt-0.5">
                  chance of hitting by {format(new Date(goal.deadline), 'MMM yyyy')}
                </p>
                {milestoneInfo.chanceChangeFromStart !== null && (
                  <p className={`text-xs mt-1 ${
                    milestoneInfo.chanceChangeFromStart > 0
                      ? 'text-sprout-700'
                      : milestoneInfo.chanceChangeFromStart < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                  }`}>
                    {milestoneInfo.chanceChangeFromStart > 0 ? '+' : ''}
                    {Math.round(milestoneInfo.chanceChangeFromStart)} percentage points from start
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/40 rounded-xl p-3">
                <p className="text-xs text-gray-500">Monthly Growth</p>
                <p className={`text-sm font-bold ${milestoneInfo.avgMonthlyGrowth >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                  {milestoneInfo.avgMonthlyGrowth >= 0 ? '+' : ''}{formatCurrency(milestoneInfo.avgMonthlyGrowth)}/mo
                </p>
              </div>
              <div className="bg-white/40 rounded-xl p-3">
                <p className="text-xs text-gray-500">Est. Arrival</p>
                <p className="text-sm font-bold text-blue-700">
                  {milestoneInfo.estimatedArrival
                    ? format(new Date(milestoneInfo.estimatedArrival), 'MMM yyyy')
                    : milestoneInfo.avgMonthlyGrowth <= 0 ? 'N/A' : '5+ years'}
                </p>
              </div>
            </div>
            {milestoneInfo.requiredMonthlyGrowth !== null && milestoneInfo.requiredMonthlyGrowth > 0 && (
              <p className="text-xs text-blue-600">
                Need +{formatCurrency(milestoneInfo.requiredMonthlyGrowth)}/mo &middot; Currently +{formatCurrency(milestoneInfo.avgMonthlyGrowth)}/mo
              </p>
            )}
            <p className="text-xs text-gray-400">
              Auto-tracks your net worth. Updates each time you visit the dashboard.
            </p>
          </div>
        )}

        {/* Simple auto-tracking note when no milestone data */}
        {isNetWorthMilestone && !isCompleted && !milestoneInfo && (
          <div className="mt-4 pt-4 border-t border-white/30">
            <div className="flex items-center gap-2 text-blue-700 text-sm">
              <TrendingUp className="w-4 h-4" />
              <p>This goal auto-tracks your net worth. Add accounts to see projections.</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {!isCompleted && !isDebtPayoff && !isNetWorthMilestone && (
          <div className="mt-4 pt-4 border-t border-white/30 flex gap-2">
            <button
              onClick={() => setShowAddFunds(!showAddFunds)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-white/50 hover:bg-white/70 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Funds
            </button>
            <button
              onClick={handleMarkComplete}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-sprout-500 text-white hover:bg-sprout-600 rounded-xl transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark Complete
            </button>
          </div>
        )}

        {isCompleted && (
          <div className="mt-4 pt-4 border-t border-white/30">
            <button
              onClick={handleReactivate}
              disabled={loading}
              className="w-full px-3 py-2 text-sm font-medium bg-white/50 hover:bg-white/70 rounded-xl transition-colors"
            >
              Reactivate Goal
            </button>
          </div>
        )}

        {/* Add Funds Form */}
        {showAddFunds && (
          <div className="mt-4 pt-4 border-t border-white/30 space-y-3">
            <CurrencyInput
              value={addAmount}
              onChange={setAddAmount}
              placeholder="0"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddFunds(false)}
                className="flex-1 px-3 py-2 text-sm font-medium bg-white/50 hover:bg-white/70 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFunds}
                disabled={loading || !addAmount}
                className="flex-1 px-3 py-2 text-sm font-medium bg-sprout-500 text-white hover:bg-sprout-600 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Linked Account Info for Debt Payoff */}
      {isDebtPayoff && linkedAccount && (
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Linked to: {linkedAccount.name}</p>
              <p className="text-sm text-gray-500">
                Current balance: {formatCurrency(linkedAccount.balance)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            This goal automatically updates when the linked account balance changes.
          </p>
        </div>
      )}

      {/* Household Contributions Breakdown */}
      {isHouseholdGoal && contributions.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-bloom-500" />
            <h3 className="font-semibold text-gray-900">Contributions</h3>
          </div>

          <div className="space-y-3">
            {contributions
              .sort((a, b) => b.total - a.total)
              .map((contrib) => {
                const percentage = Number(currentAmount) > 0
                  ? (contrib.total / Number(currentAmount)) * 100
                  : 0
                const isCurrentUser = contrib.user_id === currentUserId

                return (
                  <div key={contrib.user_id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">
                        {contrib.display_name || 'User'}
                        {isCurrentUser && <span className="text-gray-400 ml-1">(you)</span>}
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(contrib.total)}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isCurrentUser ? 'bg-bloom-500' : 'bg-sprout-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>

          <p className="text-xs text-gray-400 mt-4">
            This is a shared household goal. All members can contribute.
          </p>
        </div>
      )}

      {/* Household goal badge */}
      {isHouseholdGoal && contributions.length === 0 && (
        <div className="bg-bloom-50 rounded-xl p-4 flex gap-3">
          <Users className="w-5 h-5 text-bloom-600 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-bloom-800">Shared Household Goal</p>
            <p className="text-bloom-600">All household members can contribute to this goal.</p>
          </div>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="goal-name" className="label">Goal Name</label>
          <input
            id="goal-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What are you saving for?"
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="target-amount" className="label">Target Amount</label>
          <CurrencyInput
            id="target-amount"
            value={targetAmount}
            onChange={setTargetAmount}
            placeholder="10,000"
            required
          />
        </div>

        <div>
          <label htmlFor="starting-amount" className="label">Starting Amount</label>
          <CurrencyInput
            id="starting-amount"
            value={startingAmount}
            onChange={setStartingAmount}
            placeholder="0"
            allowNegative
          />
          <p className="text-xs text-gray-400 mt-1">
            Where you started — used to calculate progress
          </p>
        </div>

        {!isDebtPayoff && !isNetWorthMilestone && (
          <div>
            <label htmlFor="current-amount" className="label">Current Amount</label>
            <CurrencyInput
              id="current-amount"
              value={currentAmount}
              onChange={setCurrentAmount}
              placeholder="0"
            />
          </div>
        )}

        <div>
          <label htmlFor="deadline" className="label">Target Date (optional)</label>
          <input
            id="deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="input"
          />
          {goal.deadline && (
            <p className="text-xs text-gray-400 mt-1">
              Currently set to: {format(new Date(goal.deadline), 'MMMM d, yyyy')}
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name || !targetAmount}
          className="btn-primary w-full"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Delete */}
      <div className="pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="w-full py-3 px-4 rounded-xl text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? 'Deleting...' : 'Delete Goal'}
        </button>
      </div>
    </>
  )
}
