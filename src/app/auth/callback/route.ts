import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteCode = searchParams.get('invite')
  let redirectTo = searchParams.get('redirectTo') || '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check for invite code and auto-join household
      const { data: { user } } = await supabase.auth.getUser()

      if (user && inviteCode) {
        const joinedHouseholdId = await autoJoinHousehold(user.id, user.email, inviteCode)
        if (joinedHouseholdId && redirectTo === '/onboarding') {
          redirectTo = `/onboarding?joined=${joinedHouseholdId}`
        }
      } else if (user) {
        // No invite code in URL - check for pending email invitation
        const joinedHouseholdId = await checkEmailInvitation(user.id, user.email)
        if (joinedHouseholdId && redirectTo === '/onboarding') {
          redirectTo = `/onboarding?joined=${joinedHouseholdId}`
        }
      }

      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}

async function autoJoinHousehold(userId: string, userEmail: string | undefined, inviteCode: string): Promise<string | null> {
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Look up household by invite code
    const { data: household, error: householdError } = await adminClient
      .from('households')
      .select('id, name')
      .eq('invite_code', inviteCode.toUpperCase())
      .single()

    if (householdError || !household) {
      console.error('Household lookup failed:', householdError)
      return null
    }

    // Check if already a member
    const { data: existingMembership } = await adminClient
      .from('household_members')
      .select('id')
      .eq('household_id', household.id)
      .eq('user_id', userId)
      .single()

    if (existingMembership) {
      return household.id // Already a member, return household ID anyway
    }

    // Add as member
    const { error: memberError } = await adminClient
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: userId,
        role: 'member',
      })

    if (memberError) {
      console.error('Failed to add member:', memberError)
      return null
    }

    // If there was an email invitation for this user, mark it as accepted
    if (userEmail) {
      await adminClient
        .from('household_invitations')
        .update({ status: 'accepted' })
        .eq('household_id', household.id)
        .eq('invited_email', userEmail.toLowerCase())
        .eq('status', 'pending')
    }

    return household.id
  } catch (error) {
    console.error('Auto-join error:', error)
    return null
  }
}

async function checkEmailInvitation(userId: string, userEmail: string | undefined): Promise<string | null> {
  if (!userEmail) return null

  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Check for pending email invitation
    const { data: invitation, error: inviteError } = await adminClient
      .from('household_invitations')
      .select('id, household_id')
      .eq('invited_email', userEmail.toLowerCase())
      .eq('status', 'pending')
      .single()

    if (inviteError || !invitation) {
      return null // No pending invitation
    }

    // Check if already a member
    const { data: existingMembership } = await adminClient
      .from('household_members')
      .select('id')
      .eq('household_id', invitation.household_id)
      .eq('user_id', userId)
      .single()

    if (existingMembership) {
      // Already a member, just mark invitation as accepted
      await adminClient
        .from('household_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id)
      return invitation.household_id
    }

    // Add as member
    const { error: memberError } = await adminClient
      .from('household_members')
      .insert({
        household_id: invitation.household_id,
        user_id: userId,
        role: 'member',
      })

    if (memberError) {
      console.error('Failed to add member from email invitation:', memberError)
      return null
    }

    // Mark invitation as accepted
    await adminClient
      .from('household_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id)

    return invitation.household_id
  } catch (error) {
    console.error('Email invitation check error:', error)
    return null
  }
}
