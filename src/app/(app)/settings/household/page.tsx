import { createClient } from '@/lib/supabase/server'
import { HouseholdSettings } from '@/components/household/household-settings'

export default async function HouseholdSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's household membership
  const { data: membership } = await supabase
    .from('household_members')
    .select('*, households(*)')
    .eq('user_id', user.id)
    .single()

  // Get all members if user is in a household
  let members: { user_id: string; role: 'owner' | 'member'; profiles: { display_name: string | null } | null }[] = []
  if (membership?.household_id) {
    const { data: householdMembers } = await supabase
      .from('household_members')
      .select('user_id, role, profiles(display_name)')
      .eq('household_id', membership.household_id)

    // Transform the data - profiles comes as array from Supabase join
    members = (householdMembers || []).map((m: { user_id: string; role: 'owner' | 'member'; profiles: { display_name: string | null }[] | { display_name: string | null } | null }) => ({
      user_id: m.user_id,
      role: m.role,
      profiles: Array.isArray(m.profiles) ? m.profiles[0] || null : m.profiles,
    }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Household</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your household settings</p>
      </div>

      <HouseholdSettings
        membership={membership}
        members={members}
        currentUserId={user.id}
      />
    </div>
  )
}
