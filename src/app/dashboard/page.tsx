import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/(auth)/login/actions'
import { Button } from '@/components/Button'
import { ApiKeyManager } from './ApiKeyManager'
import { getApiKeys } from './actions'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { keys } = await getApiKeys()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Welcome back, {user.email}!
              </p>
            </div>
            <form action={logout}>
              <Button type="submit" variant="outline" color="slate">
                Sign out
              </Button>
            </form>
          </div>

          <ApiKeyManager initialKeys={keys} />
        </div>
      </div>
    </div>
  )
}
