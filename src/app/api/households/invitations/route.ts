import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// POST - Create a new invitation
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { householdId, email } = await request.json()

    if (!householdId || !email) {
      return NextResponse.json({ error: 'Household ID and email are required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Check user is an owner of the household
    const { data: membership, error: membershipError } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only household owners can send invitations' }, { status: 403 })
    }

    // Check if email is already a member
    const adminClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all household members' emails
    const { data: members } = await adminClient
      .from('household_members')
      .select('user_id')
      .eq('household_id', householdId)

    if (members && members.length > 0) {
      const memberIds = members.map(m => m.user_id)
      const { data: profiles } = await adminClient.auth.admin.listUsers()

      const memberEmails = profiles.users
        .filter(u => memberIds.includes(u.id))
        .map(u => u.email?.toLowerCase())

      if (memberEmails.includes(email.toLowerCase())) {
        return NextResponse.json({ error: 'This email is already a member of the household' }, { status: 400 })
      }
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from('household_invitations')
      .select('id, status')
      .eq('household_id', householdId)
      .eq('invited_email', email.toLowerCase())
      .single()

    if (existingInvitation) {
      if (existingInvitation.status === 'pending') {
        return NextResponse.json({ error: 'An invitation has already been sent to this email' }, { status: 400 })
      }
      // If declined, we could allow re-inviting, but for now just return error
      if (existingInvitation.status === 'declined') {
        return NextResponse.json({ error: 'This person has declined a previous invitation' }, { status: 400 })
      }
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('household_invitations')
      .insert({
        household_id: householdId,
        invited_email: email.toLowerCase(),
        invited_by: user.id,
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Invitation create error:', inviteError)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // Note: In a production app, you would send an email here
    // For now, the invitation is just stored and will be auto-accepted when the user signs up

    return NextResponse.json({ invitation })
  } catch (error) {
    console.error('Invitation error:', error)
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
  }
}

// GET - List pending invitations for a household
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const householdId = searchParams.get('householdId')

  if (!householdId) {
    return NextResponse.json({ error: 'Household ID is required' }, { status: 400 })
  }

  // Check user is an owner of the household
  const { data: membership, error: membershipError } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('user_id', user.id)
    .single()

  if (membershipError || !membership || membership.role !== 'owner') {
    return NextResponse.json({ error: 'Only household owners can view invitations' }, { status: 403 })
  }

  // Get pending invitations
  const { data: invitations, error: invitationsError } = await supabase
    .from('household_invitations')
    .select('id, invited_email, status, created_at')
    .eq('household_id', householdId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (invitationsError) {
    console.error('Fetch invitations error:', invitationsError)
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
  }

  return NextResponse.json({ invitations })
}
