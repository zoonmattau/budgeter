import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// DELETE - Cancel/delete an invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: invitationId } = await params

  if (!invitationId) {
    return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 })
  }

  // Get the invitation to check the household
  const { data: invitation, error: invitationError } = await supabase
    .from('household_invitations')
    .select('household_id')
    .eq('id', invitationId)
    .single()

  if (invitationError || !invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  // Check user is an owner of the household
  const { data: membership, error: membershipError } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', invitation.household_id)
    .eq('user_id', user.id)
    .single()

  if (membershipError || !membership || membership.role !== 'owner') {
    return NextResponse.json({ error: 'Only household owners can cancel invitations' }, { status: 403 })
  }

  // Delete the invitation
  const { error: deleteError } = await supabase
    .from('household_invitations')
    .delete()
    .eq('id', invitationId)

  if (deleteError) {
    console.error('Delete invitation error:', deleteError)
    return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
