import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EditAccountForm } from '@/components/net-worth/edit-account-form'

interface EditAccountPageProps {
  params: Promise<{ id: string }>
}

export default async function EditAccountPage({ params }: EditAccountPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: account } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!account) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <EditAccountForm account={account} />
    </div>
  )
}
