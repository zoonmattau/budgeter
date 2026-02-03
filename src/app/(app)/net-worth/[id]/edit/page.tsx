import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { EditAccountForm } from '@/components/net-worth/edit-account-form'
import { AccountTransactions } from '@/components/net-worth/account-transactions'

interface EditAccountPageProps {
  params: Promise<{ id: string }>
}

export default async function EditAccountPage({ params }: EditAccountPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: account }, { data: transactions }] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('transactions')
      .select('*, categories(*)')
      .eq('account_id', id)
      .eq('user_id', user.id)
      .lte('date', format(new Date(), 'yyyy-MM-dd'))
      .order('date', { ascending: false })
      .limit(10),
  ])

  if (!account) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <EditAccountForm account={account} />
      <AccountTransactions
        transactions={transactions || []}
        accountId={id}
        accountName={account.name}
      />
    </div>
  )
}
