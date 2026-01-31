import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/settings/settings-form'
import { SignOutButton } from '@/components/settings/sign-out-button'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: stats } = await supabase
    .from('user_stats')
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

      {/* Stats */}
      {stats && (
        <section className="card">
          <h2 className="font-display font-semibold text-gray-900 mb-4">Your Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-bloom-50 rounded-xl">
              <p className="text-2xl font-bold text-bloom-600">{stats.total_xp}</p>
              <p className="text-xs text-gray-500">Total XP</p>
            </div>
            <div className="text-center p-3 bg-coral-50 rounded-xl">
              <p className="text-2xl font-bold text-coral-600">{stats.current_streak}</p>
              <p className="text-xs text-gray-500">Day Streak</p>
            </div>
            <div className="text-center p-3 bg-sprout-50 rounded-xl">
              <p className="text-2xl font-bold text-sprout-600">{stats.goals_completed}</p>
              <p className="text-xs text-gray-500">Goals Completed</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-xl">
              <p className="text-2xl font-bold text-amber-600">{stats.challenges_won}</p>
              <p className="text-xs text-gray-500">Challenges Won</p>
            </div>
          </div>
        </section>
      )}

      {/* Sign Out */}
      <section className="card">
        <h2 className="font-display font-semibold text-gray-900 mb-4">Account</h2>
        <SignOutButton />
      </section>
    </div>
  )
}
