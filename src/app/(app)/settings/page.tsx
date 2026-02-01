import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/settings/settings-form'
import { SignOutButton } from '@/components/settings/sign-out-button'
import { LeaderboardSettings } from '@/components/settings/leaderboard-settings'
import { Users, ChevronRight, Trophy } from 'lucide-react'
import Link from 'next/link'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-gray-900">Settings</h1>

      {/* Profile */}
      <section className="card">
        <h2 className="font-display font-semibold text-gray-900 mb-4">Profile</h2>
        <SettingsForm profile={profile} userEmail={user.email || ''} />
      </section>

      {/* Household */}
      <section className="card">
        <Link
          href="/settings/household"
          className="flex items-center justify-between py-2 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-bloom-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-bloom-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 group-hover:text-bloom-600 transition-colors">
                Household
              </p>
              <p className="text-sm text-gray-500">Manage shared budgets</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-bloom-600 transition-colors" />
        </Link>
      </section>

      {/* Leaderboard Settings */}
      <section className="card">
        <h2 className="font-display font-semibold text-gray-900 mb-4">
          <Trophy className="w-5 h-5 inline mr-2" />
          Leaderboard Visibility
        </h2>
        <LeaderboardSettings preferences={preferences} userId={user.id} />
      </section>

      {/* Sign Out */}
      <section className="card">
        <h2 className="font-display font-semibold text-gray-900 mb-4">Account</h2>
        <SignOutButton />
      </section>
    </div>
  )
}
