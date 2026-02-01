import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BillEditForm } from '@/components/bills/bill-edit-form'

interface BillPageProps {
  params: Promise<{ id: string }>
}

export default async function BillPage({ params }: BillPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: bill } = await supabase
    .from('bills')
    .select('*, categories(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!bill) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <BillEditForm bill={bill} />
    </div>
  )
}
