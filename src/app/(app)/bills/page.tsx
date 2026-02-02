import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BillsList } from '@/components/bills/bills-list'
import { formatCurrency } from '@/lib/utils'

export default async function BillsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: bills } = await supabase
    .from('bills')
    .select('*, categories(*)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('next_due', { ascending: true })

  const totalMonthly = bills?.reduce((sum, bill) => {
    // Exclude one-off bills from monthly estimate
    if (bill.is_one_off) return sum
    const amount = Number(bill.amount)
    switch (bill.frequency) {
      case 'weekly': return sum + amount * 4.33
      case 'fortnightly': return sum + amount * 2.17
      case 'monthly': return sum + amount
      case 'quarterly': return sum + amount / 3
      case 'yearly': return sum + amount / 12
      default: return sum + amount
    }
  }, 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Bills</h1>
          <p className="text-gray-500 text-sm mt-1">
            {bills?.length || 0} upcoming bill{bills?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/bills/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Bill
        </Link>
      </div>

      {/* Monthly Total */}
      <div className="card bg-gradient-to-br from-amber-50 to-coral-50">
        <p className="text-sm text-gray-600">Estimated Monthly Bills</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totalMonthly)}</p>
      </div>

      <BillsList bills={bills || []} />
    </div>
  )
}
