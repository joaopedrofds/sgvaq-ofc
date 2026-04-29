'use client'

import { useState } from 'react'
import { loginMockAction } from './mock-login-action'

export function MockLoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const result = await loginMockAction(form)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // Se deu certo, a server action faz o redirect
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="mock-email" className="text-sm font-medium text-gray-700">Email</label>
        <input
          id="mock-email"
          name="email"
          type="email"
          defaultValue="admin@vaquejada.com"
          required
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="mock-password" className="text-sm font-medium text-gray-700">Senha</label>
        <input
          id="mock-password"
          name="password"
          type="password"
          defaultValue="123456789"
          required
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-700 hover:bg-amber-800 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}