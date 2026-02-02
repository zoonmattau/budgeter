import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calculateNextExpected } from '@/lib/patterns/matcher'
import { autoMatchPredictions } from '@/lib/patterns/cycle-checker'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Auto-match any pending predictions with recent transactions
    const matchedCount = await autoMatchPredictions(supabase, user.id)

    // Get active patterns that are due within 7 days
    const { data: patterns } = await supabase
      .from('payment_patterns')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (!patterns || patterns.length === 0) {
      return NextResponse.json({
        synced: 0,
        matched: matchedCount,
        message: 'No patterns to sync'
      })
    }

    const now = new Date()
    const sevenDaysFromNow = new Date(now)
    sevenDaysFromNow.setDate(now.getDate() + 7)

    let createdPredictions = 0

    for (const pattern of patterns) {
      const nextExpected = pattern.next_expected ? new Date(pattern.next_expected) : null

      // Check if pattern is due within the next 7 days
      if (!nextExpected || nextExpected > sevenDaysFromNow) {
        continue
      }

      // Check if we already have a pending prediction for this pattern in this cycle
      const { data: existingPrediction } = await supabase
        .from('pattern_predictions')
        .select('id')
        .eq('pattern_id', pattern.id)
        .eq('status', 'pending')
        .single()

      if (existingPrediction) {
        // Already have a pending prediction
        continue
      }

      // Create a new prediction
      const { error } = await supabase
        .from('pattern_predictions')
        .insert({
          pattern_id: pattern.id,
          user_id: user.id,
          predicted_date: pattern.next_expected,
          predicted_amount: pattern.typical_amount,
          status: 'pending'
        })

      if (!error) {
        createdPredictions++
      }
    }

    // Expire old predictions that are more than 7 days past their predicted date
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 7)

    await supabase
      .from('pattern_predictions')
      .update({
        status: 'expired',
        resolved_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .lt('predicted_date', sevenDaysAgo.toISOString().split('T')[0])

    return NextResponse.json({
      synced: createdPredictions,
      matched: matchedCount,
      message: `Created ${createdPredictions} predictions, matched ${matchedCount}`
    })
  } catch (error) {
    console.error('Pattern sync error:', error)
    return NextResponse.json({ error: 'Failed to sync patterns' }, { status: 500 })
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get pending predictions with pattern details
    const now = new Date()
    const threeDaysAgo = new Date(now)
    threeDaysAgo.setDate(now.getDate() - 3)
    const sevenDaysFromNow = new Date(now)
    sevenDaysFromNow.setDate(now.getDate() + 7)

    const { data: predictions, error } = await supabase
      .from('pattern_predictions')
      .select(`
        *,
        payment_patterns (
          id,
          name,
          normalized_name,
          typical_amount,
          frequency,
          confidence,
          category_id,
          categories:category_id (
            id,
            name,
            icon,
            color
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .gte('predicted_date', threeDaysAgo.toISOString().split('T')[0])
      .lte('predicted_date', sevenDaysFromNow.toISOString().split('T')[0])
      .order('predicted_date', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ predictions: predictions || [] })
  } catch (error) {
    console.error('Error fetching predictions:', error)
    return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 })
  }
}
