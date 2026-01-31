'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, Plane, Car, Home, Gift, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const goalTemplates = [
  { name: 'Emergency Fund', icon: Sparkles, color: '#d946ef', target: 10000 },
  { name: 'Holiday', icon: Plane, color: '#3b82f6', target: 5000 },
  { name: 'New Car', icon: Car, color: '#22c55e', target: 15000 },
  { name: 'Home Deposit', icon: Home, color: '#f97316', target: 50000 },
  { name: 'Gift', icon: Gift, color: '#ec4899', target: 500 },
  { name: 'Education', icon: GraduationCap, color: '#8b5cf6', target: 3000 },
]

export default function NewGoalPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<typeof goalTemplates[0] | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  function handleTemplateSelect(template: typeof goalTemplates[0]) {
    setSelectedTemplate(template)
    setName(template.name)
    setTargetAmount(template.target.toString())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !targetAmount) return

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('goals').insert({
      user_id: user.id,
      name,
      target_amount: parseFloat(targetAmount),
      deadline: deadline || null,
      icon: 'target',
      color: selectedTemplate?.color || '#d946ef',
      visual_type: 'plant',
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
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
              <input
                type="number"
                min="1"
                step="1"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="10,000"
                className="input pl-8 text-lg font-semibold"
                required
              />
            </div>
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
    </div>
  )
}
