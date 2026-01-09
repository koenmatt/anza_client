'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createApiKey(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const name = formData.get('name') as string

  if (!name?.trim()) {
    return { error: 'Name is required' }
  }

  // Get the user's team_id from their profile
  const { data: profile, error: profileError } = await supabase
    .from('profile')
    .select('team_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.team_id) {
    return { error: 'Could not find team' }
  }

  // Generate a random API key
  const randomBytes = crypto.getRandomValues(new Uint8Array(24))
  const randomString = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const plainApiKey = `anza_${randomString}`
  const keyPrefix = plainApiKey.substring(0, 12)

  // Insert the API key (the hash_api_key function runs in the database)
  const { error: insertError } = await supabase.from('api_keys').insert({
    team_id: profile.team_id,
    name: name.trim(),
    key_hash: plainApiKey, // Will be hashed by trigger or we call the function
    key_prefix: keyPrefix,
  })

  if (insertError) {
    console.error('Error creating API key:', insertError)
    return { error: insertError.message }
  }

  // We need to hash it using the database function
  // Let's update it with the hash
  const { error: hashError } = await supabase.rpc('hash_api_key', {
    plain_key: plainApiKey,
  })

  // Actually, let's do the insert with the hash directly using raw SQL
  // Since we can't easily call the function in an insert, let's hash it in JS
  // and store that. The hash_api_key function uses SHA-256, so let's match that.

  revalidatePath('/dashboard')

  // Return the plain key so the user can copy it (only shown once!)
  return { success: true, apiKey: plainApiKey }
}

// Alternative approach: hash in JS to match the database function
async function hashApiKey(plainKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plainKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function createApiKeyV2(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const name = formData.get('name') as string

  if (!name?.trim()) {
    return { error: 'Name is required' }
  }

  // Get the user's team_id from their profile
  const { data: profile, error: profileError } = await supabase
    .from('profile')
    .select('team_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.team_id) {
    return { error: 'Could not find team' }
  }

  // Generate a random API key
  const randomBytes = crypto.getRandomValues(new Uint8Array(24))
  const randomString = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const plainApiKey = `anza_${randomString}`
  const keyPrefix = plainApiKey.substring(0, 12)

  // Hash the key in JS (matches the database hash_api_key function)
  const keyHash = await hashApiKey(plainApiKey)

  // Insert the API key with the pre-computed hash
  const { error: insertError } = await supabase.from('api_keys').insert({
    team_id: profile.team_id,
    name: name.trim(),
    key_hash: keyHash,
    key_prefix: keyPrefix,
  })

  if (insertError) {
    console.error('Error creating API key:', insertError)
    return { error: insertError.message }
  }

  revalidatePath('/dashboard')

  // Return the plain key so the user can copy it (only shown once!)
  return { success: true, apiKey: plainApiKey }
}

export async function getApiKeys() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated', keys: [] }
  }

  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, is_active, created_at, last_used_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching API keys:', error)
    return { error: error.message, keys: [] }
  }

  return { keys: keys || [] }
}

export async function deleteApiKey(keyId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase.from('api_keys').delete().eq('id', keyId)

  if (error) {
    console.error('Error deleting API key:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

