'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { aprovarComprovante, rejeitarComprovante, getComprovanteUrl } from '@/actions/comprovantes'
import { useRouter } from 'next/navigation'

export function ComprovanteReview({ senha }: { senha: any }) {
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleVerComprovante() {
    const res = await getComprovanteUrl(senha.id)
    if (res.url) window.open(res.url, '_blank')
  }

  async function handleAprovar() {
    setLoading(true)
    await aprovarComprovante(senha.id)
    router.refresh()
  }

  async function handleRejeitar() {
    if (!motivo.trim()) { alert('Informe o motivo da rejeição'); return }
    setLoading(true)
    await rejeitarComprovante(senha.id, motivo)
    router.refresh()
  }

  return (
    <div className="bg-white border rounded-lg p-4 space-y-3">
      <div className="flex justify-between">
        <div>
          <p className="font-semibold">{senha.competidores?.nome}</p>
          <p className="text-sm text-gray-500">
            {senha.modalidades?.eventos?.nome} — {senha.modalidades?.nome}
          </p>
          <p className="text-xs text-gray-400">
            {new Date(senha.created_at).toLocaleString('pt-BR')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleVerComprovante}>
          Ver comprovante
        </Button>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleAprovar} disabled={loading} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
          Aprovar
        </Button>
        <div className="flex-1 flex gap-2">
          <Input
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Motivo da rejeição..."
            className="text-sm"
          />
          <Button onClick={handleRejeitar} disabled={loading} size="sm" variant="destructive">
            Rejeitar
          </Button>
        </div>
      </div>
    </div>
  )
}
