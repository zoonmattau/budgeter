'use client'

import Link from 'next/link'
import { PieChart, Layers, Sparkles } from 'lucide-react'

export function QuickLinks() {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Link
        href="/buckets"
        className="card-hover flex flex-col items-center gap-2 p-4 text-center"
      >
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Layers className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900 text-sm">Buckets</p>
        </div>
      </Link>

      <Link
        href="/insights"
        className="card-hover flex flex-col items-center gap-2 p-4 text-center"
      >
        <div className="w-10 h-10 rounded-full bg-bloom-100 flex items-center justify-center">
          <PieChart className="w-5 h-5 text-bloom-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900 text-sm">Insights</p>
        </div>
      </Link>

      <Link
        href="/import"
        className="card-hover flex flex-col items-center gap-2 p-4 text-center"
      >
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900 text-sm">Smart Import</p>
        </div>
      </Link>
    </div>
  )
}
