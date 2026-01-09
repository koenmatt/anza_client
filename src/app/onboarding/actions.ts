'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const teamName = formData.get('team_name') as string

  if (!teamName?.trim()) {
    redirect('/onboarding?error=Team name is required')
  }

  // Create the team
  const { data: team, error: teamError } = await supabase
    .from('team')
    .insert({ name: teamName.trim() })
    .select()
    .single()

  if (teamError) {
    console.error('Error creating team:', teamError)
    redirect('/onboarding?error=' + encodeURIComponent(teamError.message))
  }

  // Update the profile with team_id and mark onboarding complete
  const { error: profileError } = await supabase
    .from('profile')
    .update({
      team_id: team.id,
      has_completed_onboarding: true,
    })
    .eq('id', user.id)

  if (profileError) {
    console.error('Error updating profile:', profileError)
    redirect('/onboarding?error=' + encodeURIComponent(profileError.message))
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

