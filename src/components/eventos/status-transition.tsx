'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { transitionEventoStatus } from '@/actions/eventos'
import type { EventoStatus } from '@/types'

const transitions: Record<EventoStatus, { to: EventoStatus; label: string; variant: 'default' | 'destructive' } | null> = {
  rascunho: { to: 'aberto', label: 'Abrir vendas', variant: 'default' },
  aberto: { to: 'em_andamento', label: 'Iniciar prova', variant: 'default' },
  em_andamento: { to: 'encerrado', label: 'Encerrar prova', variant: 'destructive' },
  encerrado: null,
}

export function StatusTransition({ eventoId, currentStatus }: { eventoId: string; currentStatus: EventoStatus }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const transition = transitions[currentStatus]

  if (!transition) return <p className="text-sm text-gray-500">Evento encerrado.</p>

  async function handleTransition() {
    if (!confirm(`Confirmar: ${transition!.label}?`)) return
    setLoading(true)
    const result = await transitionEventoStatus(eventoId, transition!.to)
    if ('error' in result) setError(result.error ?? 'Erro')
    setLoading(false)
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleTransition}
        disabled={loading}
        variant={transition.variant}
      >
        {loading ? 'Processando...' : transition.label}
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
