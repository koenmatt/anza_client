import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/Button'
import { TextField } from '@/components/Fields'
import { Logo } from '@/components/Logo'
import { SlimLayout } from '@/components/SlimLayout'
import { completeOnboarding } from './actions'

export default async function OnboardingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user has already completed onboarding
  const { data: profile } = await supabase
    .from('profile')
    .select('has_completed_onboarding, first_name')
    .eq('id', user.id)
    .single()

  if (profile?.has_completed_onboarding) {
    redirect('/dashboard')
  }

  return (
    <SlimLayout>
      <div className="flex">
        <Logo />
      </div>
      <h2 className="mt-20 text-lg font-semibold text-gray-900">
        Welcome{profile?.first_name ? `, ${profile.first_name}` : ''}! Let's set up your team
      </h2>
      <p className="mt-2 text-sm text-gray-700">
        Create a team to get started with Anza.
      </p>
      <form action={completeOnboarding} className="mt-10 grid grid-cols-1 gap-y-8">
        <TextField
          label="Team name"
          name="team_name"
          type="text"
          placeholder="e.g. Acme Corp"
          required
        />
        <div>
          <Button type="submit" variant="solid" color="blue" className="w-full">
            <span>
              Continue <span aria-hidden="true">&rarr;</span>
            </span>
          </Button>
        </div>
      </form>
    </SlimLayout>
  )
}

