'use client'

import { TrendingUp, AlertTriangle, TrendingDown } from 'lucide-react'

interface LikelihoodBadgeProps {
  likelihood: 'on_track' | 'at_risk' | 'behind'
}

const config = {
  on_track: {
    label: 'On track',
    icon: TrendingUp,
    className: 'badge-success',
  },
  at_risk: {
    label: 'At risk',
    icon: AlertTriangle,
    className: 'badge-warning',
  },
  behind: {
    label: 'Behind',
    icon: TrendingDown,
    className: 'badge-danger',
  },
}

export function LikelihoodBadge({ likelihood }: LikelihoodBadgeProps) {
  const { label, icon: Icon, className } = config[likelihood]

  return (
    <span className={`${className} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}
