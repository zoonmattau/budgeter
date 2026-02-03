'use client'

import { Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function SetupPrompt() {
  return (
    <div className="card bg-gradient-to-br from-amber-50 to-coral-50 text-center py-8">
      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
        <Calendar className="w-8 h-8 text-amber-500" />
      </div>
      <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
        Set Up Your Pay Schedule
      </h3>
      <p className="text-sm text-gray-600 mb-4 max-w-xs mx-auto">
        To show your cash flow timeline, we need to know when you get paid.
        Head to Budget to set up your income schedule.
      </p>
      <Link
        href="/budget"
        className="inline-flex items-center gap-2 btn-primary"
      >
        Go to Budget
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
