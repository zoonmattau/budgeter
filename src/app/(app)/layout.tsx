import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/navigation/bottom-nav'
import { TopBar } from '@/components/navigation/top-bar'
import { CurrencyProvider } from '@/components/providers/currency-provider'
import { ScopeProvider } from '@/components/providers/scope-provider'
import { HouseholdMember } from '@/lib/scope-context'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Redirect to onboarding if not completed
  if (profile && !profile.onboarding_completed) {
    redirect('/onboarding')
  }

  // Fetch household membership
  const { data: membership } = await supabase
    .from('household_members')
    .select(`
      household_id,
      role,
      households (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .single()

  // Fetch household members if user is in a household
  let members: HouseholdMember[] = []
  if (membership?.household_id) {
    const { data: householdMembers } = await supabase
      .from('household_members')
      .select(`
        user_id,
        role,
        profiles (
          display_name
        )
      `)
      .eq('household_id', membership.household_id)

    members = (householdMembers || []).map((m) => {
      const profile = m.profiles as unknown as { display_name: string | null } | null
      return {
        user_id: m.user_id,
        display_name: profile?.display_name || null,
        role: m.role as 'owner' | 'member',
      }
    })
  }

  const household = membership?.households as unknown as { id: string; name: string } | null

  return (
    <CurrencyProvider currency={profile?.currency || 'AUD'}>
      <ScopeProvider
        initialHouseholdId={household?.id || null}
        initialHouseholdName={household?.name || null}
        initialMembers={members}
      >
        <div className="min-h-screen pb-20">
          <TopBar />
          <main className="px-4 py-4 max-w-lg mx-auto">
            {children}
          </main>
          <BottomNav />
        </div>
      </ScopeProvider>
    </CurrencyProvider>
  )
}
