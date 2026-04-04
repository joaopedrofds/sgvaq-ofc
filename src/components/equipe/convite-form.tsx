'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { convidarMembro } from '@/actions/equipe'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ConviteForm() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'financeiro' | 'juiz' | 'locutor'>('juiz')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await convidarMembro({ nome, email, role })
    if ('error' in result) { setError(result.error ?? 'Erro'); setLoading(false); return }
    setSuccess(true)
    router.refresh()
  }

  if (success) return <p className="text-green-600">Convite enviado para {email}!</p>

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div className="space-y-1">
        <Label>Nome</Label>
        <Input value={nome} onChange={e => setNome(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label>Email</Label>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label>Função</Label>
        <Select value={role} onValueChange={v => setRole(v as 'financeiro' | 'juiz' | 'locutor')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="financeiro">Financeiro</SelectItem>
            <SelectItem value="juiz">Juiz</SelectItem>
            <SelectItem value="locutor">Locutor</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading} className="bg-amber-700 hover:bg-amber-800">
        {loading ? 'Enviando...' : 'Enviar convite'}
      </Button>
    </form>
  )
}
