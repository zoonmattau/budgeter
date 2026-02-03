import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: NextRequest) {
  // Use regular client to get authenticated user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role client for database operations (bypasses RLS)
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const inviteCode = generateInviteCode()

    // Create household using admin client (bypasses RLS)
    const { data: household, error: householdError } = await adminClient
      .from('households')
      .insert({
        name: name.trim(),
        created_by: user.id,
        invite_code: inviteCode,
      })
      .select()
      .single()

    if (householdError) {
      console.error('Household create error:', householdError)
      return NextResponse.json({ error: householdError.message }, { status: 500 })
    }

    // Add creator as owner (ignore if trigger already added them)
    await adminClient
      .from('household_members')
      .upsert({
        household_id: household.id,
        user_id: user.id,
        role: 'owner',
      }, {
        onConflict: 'household_id,user_id',
        ignoreDuplicates: true
      })

    return NextResponse.json({ household, inviteCode })
  } catch (error) {
    console.error('Household creation error:', error)
    return NextResponse.json({ error: 'Failed to create household' }, { status: 500 })
  }
}
