import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function OnboardingLayout({
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
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  // If already completed onboarding, redirect to dashboard
  if (profile?.onboarding_completed) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Image src="/Seedling.png" alt="Seedling" width={32} height={32} className="w-8 h-8" />
          <span className="font-display font-semibold text-gray-900">Seedling</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pb-8 max-w-lg mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
