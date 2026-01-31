'use client'

import Link from 'next/link'
import { PieChart, Layers } from 'lucide-react'

export function QuickLinks() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        href="/buckets"
        className="card-hover flex items-center gap-3 p-4"
      >
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Layers className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">Buckets</p>
          <p className="text-xs text-gray-500">Money allocation</p>
        </div>
      </Link>

      <Link
        href="/insights"
        className="card-hover flex items-center gap-3 p-4"
      >
        <div className="w-10 h-10 rounded-full bg-bloom-100 flex items-center justify-center">
          <PieChart className="w-5 h-5 text-bloom-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">Insights</p>
          <p className="text-xs text-gray-500">Charts & trends</p>
        </div>
      </Link>
    </div>
  )
}
