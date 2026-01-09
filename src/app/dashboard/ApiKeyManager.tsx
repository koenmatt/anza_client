'use client'

import { useState, useTransition } from 'react'
import { createApiKeyV2, deleteApiKey } from './actions'

type ApiKey = {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  created_at: string
  last_used_at: string | null
}

export function ApiKeyManager({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys)
  const [isCreating, setIsCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData()
    formData.append('name', newKeyName)

    startTransition(async () => {
      const result = await createApiKeyV2(formData)

      if (result.error) {
        setError(result.error)
      } else if (result.apiKey) {
        setGeneratedKey(result.apiKey)
        setNewKeyName('')
        // Refresh the keys list - add the new key optimistically
        setKeys((prev) => [
          {
            id: crypto.randomUUID(),
            name: newKeyName,
            key_prefix: result.apiKey!.substring(0, 12),
            is_active: true,
            created_at: new Date().toISOString(),
            last_used_at: null,
          },
          ...prev,
        ])
      }
    })
  }

  const handleCopy = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDismissKey = () => {
    setGeneratedKey(null)
    setIsCreating(false)
    setCopied(false)
  }

  const handleDelete = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return
    }

    startTransition(async () => {
      const result = await deleteApiKey(keyId)
      if (!result.error) {
        setKeys((prev) => prev.filter((k) => k.id !== keyId))
      }
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
        {!isCreating && !generatedKey && (
          <button
            onClick={() => setIsCreating(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create API Key
          </button>
        )}
      </div>

      {/* Generated Key Display - Only shown once! */}
      {generatedKey && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-amber-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-amber-800">
                Save your API key now!
              </h3>
              <p className="mt-1 text-sm text-amber-700">
                This is the only time you&apos;ll see this key. Copy it and store it
                securely.
              </p>
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-sm text-gray-900 ring-1 ring-amber-300">
                    {generatedKey}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <button
                  onClick={handleDismissKey}
                  className="text-sm font-medium text-amber-800 hover:text-amber-900"
                >
                  I&apos;ve saved my key →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Key Form */}
      {isCreating && !generatedKey && (
        <form onSubmit={handleCreate} className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <label
            htmlFor="key-name"
            className="block text-sm font-medium text-gray-700"
          >
            Key Name
          </label>
          <p className="mt-1 text-sm text-gray-500">
            Give your API key a descriptive name to help you remember what it&apos;s
            used for.
          </p>
          <div className="mt-3 flex gap-3">
            <input
              type="text"
              id="key-name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Production API Key"
              className="block flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              required
            />
            <button
              type="submit"
              disabled={isPending || !newKeyName.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false)
                setNewKeyName('')
                setError(null)
              }}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </form>
      )}

      {/* Keys List */}
      <div className="mt-6">
        {keys.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No API keys</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new API key.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Key
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Last Used
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {key.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-500">
                      {key.key_prefix}...
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {formatDate(key.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <button
                        onClick={() => handleDelete(key.id)}
                        disabled={isPending}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

