'use client'

import { useState } from 'react'
import { Users, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LeaderboardSettingsProps {
  preferences: {
    id: string
    user_id: string
    friends_leaderboard_visible: boolean
    global_leaderboard_visible: boolean
  } | null
  userId: string
}

export function LeaderboardSettings({ preferences, userId }: LeaderboardSettingsProps) {
  const [friendsVisible, setFriendsVisible] = useState(
    preferences?.friends_leaderboard_visible ?? false
  )
  const [globalVisible, setGlobalVisible] = useState(
    preferences?.global_leaderboard_visible ?? false
  )
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  async function handleToggle(type: 'friends' | 'global') {
    setSaving(true)

    const newFriendsVisible = type === 'friends' ? !friendsVisible : friendsVisible
    const newGlobalVisible = type === 'global' ? !globalVisible : globalVisible

    if (preferences) {
      // Update existing preferences
      await supabase
        .from('user_preferences')
        .update({
          friends_leaderboard_visible: newFriendsVisible,
          global_leaderboard_visible: newGlobalVisible,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
    } else {
      // Create new preferences
      await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          friends_leaderboard_visible: newFriendsVisible,
          global_leaderboard_visible: newGlobalVisible,
        })
    }

    if (type === 'friends') {
      setFriendsVisible(newFriendsVisible)
    } else {
      setGlobalVisible(newGlobalVisible)
    }

    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-bloom-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-bloom-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Friends Leaderboard</p>
            <p className="text-sm text-gray-500">Show your net worth to friends</p>
          </div>
        </div>
        <button
          onClick={() => handleToggle('friends')}
          disabled={saving}
          className={`relative w-12 h-7 rounded-full transition-colors ${
            friendsVisible ? 'bg-sprout-500' : 'bg-gray-200'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              friendsVisible ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-coral-100 flex items-center justify-center">
            <Globe className="w-5 h-5 text-coral-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Global Leaderboard</p>
            <p className="text-sm text-gray-500">Show your net worth to everyone</p>
          </div>
        </div>
        <button
          onClick={() => handleToggle('global')}
          disabled={saving}
          className={`relative w-12 h-7 rounded-full transition-colors ${
            globalVisible ? 'bg-sprout-500' : 'bg-gray-200'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              globalVisible ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
