'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/database.types'

interface SettingsFormProps {
  profile: Tables<'profiles'> | null
  userEmail: string
}

export function SettingsForm({ profile, userEmail }: SettingsFormProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = createClient()

  async function handleSave() {
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Email</label>
        <input
          type="email"
          value={userEmail}
          disabled
          className="input bg-gray-50 text-gray-500"
        />
      </div>

      <div>
        <label className="label">Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="input"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary"
      >
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
      </button>
    </div>
  )
}
