'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Users, UserPlus, User } from 'lucide-react'
import { CreateHouseholdForm } from './create-household-form'
import { JoinHouseholdForm } from './join-household-form'

type HouseholdOption = 'none' | 'solo' | 'create' | 'join'

interface HouseholdStepProps {
  onBack: () => void
  onNext: (householdId: string | null) => void
}

export function HouseholdStep({ onBack, onNext }: HouseholdStepProps) {
  const [selectedOption, setSelectedOption] = useState<HouseholdOption>('none')

  // When user completes household creation/joining
  const handleHouseholdComplete = (householdId: string) => {
    onNext(householdId)
  }

  // When user chooses "Just me" (solo)
  const handleSolo = () => {
    onNext(null)
  }

  // Show create form
  if (selectedOption === 'create') {
    return (
      <CreateHouseholdForm
        onBack={() => setSelectedOption('none')}
        onComplete={handleHouseholdComplete}
      />
    )
  }

  // Show join form
  if (selectedOption === 'join') {
    return (
      <JoinHouseholdForm
        onBack={() => setSelectedOption('none')}
        onComplete={handleHouseholdComplete}
      />
    )
  }

  // Default: show option selection (none or solo)
  const isSoloSelected = selectedOption === 'solo'

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
        Who&apos;s budgeting with you?
      </h1>
      <p className="text-gray-500 mb-6">
        Set up a household to share budgets and track spending together.
      </p>

      <div className="space-y-3 mb-8">
        {/* Just me */}
        <button
          onClick={() => setSelectedOption('solo')}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
            isSoloSelected
              ? 'border-bloom-500 bg-bloom-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isSoloSelected ? 'bg-bloom-100' : 'bg-gray-100'
          }`}>
            <User className={`w-6 h-6 ${isSoloSelected ? 'text-bloom-600' : 'text-gray-500'}`} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Just me</p>
            <p className="text-sm text-gray-500">I&apos;ll manage my budget solo</p>
          </div>
        </button>

        {/* Create household */}
        <button
          onClick={() => setSelectedOption('create')}
          className="w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 border-gray-200 hover:border-gray-300"
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100">
            <Users className="w-6 h-6 text-gray-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Create a household</p>
            <p className="text-sm text-gray-500">Start a new household and invite others</p>
          </div>
        </button>

        {/* Join household */}
        <button
          onClick={() => setSelectedOption('join')}
          className="w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 border-gray-200 hover:border-gray-300"
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100">
            <UserPlus className="w-6 h-6 text-gray-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Join a household</p>
            <p className="text-sm text-gray-500">Enter an invite code to join</p>
          </div>
        </button>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={handleSolo}
          disabled={!isSoloSelected}
          className="btn-primary flex-1"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
