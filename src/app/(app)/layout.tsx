import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/navigation/bottom-nav'
import { TopBar } from '@/components/navigation/top-bar'

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

  return (
    <div className="min-h-screen pb-20">
      <TopBar />
      <main className="px-4 py-4 max-w-lg mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
