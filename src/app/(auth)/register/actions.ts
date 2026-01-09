'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const firstName = formData.get('first_name') as string
  const lastName = formData.get('last_name') as string

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  })

  if (authError) {
    redirect('/register?error=' + encodeURIComponent(authError.message))
  }

  // Create profile for the new user
  if (authData.user) {
    const { error: profileError } = await supabase.from('profile').insert({
      id: authData.user.id,
      first_name: firstName,
      last_name: lastName,
      has_completed_onboarding: false,
    })

    if (profileError) {
      console.error('Error creating profile:', profileError)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/register?message=Check your email to confirm your account')
}
