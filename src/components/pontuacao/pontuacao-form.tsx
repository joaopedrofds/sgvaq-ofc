'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { enqueuePassada, buildPassadaPayload } from '@/lib/offline/queue'
import { createClient } from '@/lib/supabase/client'
import type { DetalheCriterio } from '@/lib/offline/queue'

interface Criterio {
  id: string
  nome_criterio: string
  peso: number
  valor_minimo: number
  valor_maximo: number
}

interface PontuacaoFormProps {
  senhaId: string
  modalidadeId: string
  juizId: string
  numeroPassada: number
  nomeCompetidor: string
  criterios: Criterio[]
  isOnline: boolean
}

export function PontuacaoForm({
  senhaId, modalidadeId, juizId, numeroPassada,
  nomeCompetidor, criterios, isOnline
}: PontuacaoFormProps) {
  const [valores, setValores] = useState<Record<string, number>>(
    Object.fromEntries(criterios.map(c => [c.id, 0]))
  )
  const [penalidade, setPenalidade] = useState(0)
  const [penalMotivo, setPenalMotivo] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detalhes: DetalheCriterio[] = criterios.map(c => ({
    criterio_id: c.id,
    nome: c.nome_criterio,
    valor: valores[c.id] ?? 0,
    peso: c.peso,
    pontuacao: (valores[c.id] ?? 0) * c.peso,
    observacao: '',
  }))

  const pontuacaoTotal = detalhes.reduce((sum, d) => sum + d.pontuacao, 0) - penalidade

  async function handleSubmit() {
    const payload = buildPassadaPayload({
      senha_id: senhaId,
      modalidade_id: modalidadeId,
      numero_passada: numeroPassada,
      juiz_id: juizId,
      detalhes,
      penalidade,
      penalidade_motivo: penalMotivo,
    })

    if (isOnline) {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/sync-passadas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok && res.status !== 409) {
        setError('Erro ao enviar. Tente novamente.')
        setConfirming(false)
        return
      }
    } else {
      await enqueuePassada(payload)
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="text-5xl">✅</div>
        <p className="text-xl font-bold text-green-700">Pontuação registrada!</p>
        <p className="text-gray-600">Total: <strong>{pontuacaoTotal.toFixed(2)} pts</strong></p>
        <Button onClick={() => setSent(false)} className="bg-amber-700 hover:bg-amber-800">
          Próxima passada
        </Button>
      </div>
    )
  }

  if (confirming) {
    return (
      <div className="space-y-4">
        <h3 className="font-bold text-lg">Confirmar pontuação</h3>
        <p className="text-3xl font-bold text-amber-700 text-center">{pontuacaoTotal.toFixed(2)} pts</p>
        <div className="space-y-1 text-sm">
          {detalhes.map(d => (
            <div key={d.criterio_id} className="flex justify-between">
              <span>{d.nome}</span>
              <span>{d.valor} × {d.peso} = {d.pontuacao.toFixed(2)}</span>
            </div>
          ))}
          {penalidade > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Penalidade ({penalMotivo})</span>
              <span>-{penalidade}</span>
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={handleSubmit} className="flex-1 bg-green-600 hover:bg-green-700">
            Confirmar e enviar
          </Button>
          <Button variant="outline" onClick={() => setConfirming(false)} className="flex-1">
            Corrigir
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 rounded-lg p-3 text-center">
        <p className="font-bold text-lg">{nomeCompetidor}</p>
        <p className="text-sm text-gray-500">Passada #{numeroPassada}</p>
      </div>

      {criterios.map(c => (
        <div key={c.id} className="space-y-1">
          <Label>{c.nome_criterio} (peso {c.peso})</Label>
          <Input
            type="number"
            min={c.valor_minimo}
            max={c.valor_maximo}
            step="0.5"
            value={valores[c.id] ?? 0}
            onChange={e => setValores(v => ({ ...v, [c.id]: parseFloat(e.target.value) || 0 }))}
          />
          <p className="text-xs text-gray-500">{c.valor_minimo} – {c.valor_maximo}</p>
        </div>
      ))}

      <div className="space-y-1">
        <Label>Penalidade (opcional)</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={0}
            value={penalidade}
            onChange={e => setPenalidade(parseFloat(e.target.value) || 0)}
            className="w-24"
          />
          <Input
            value={penalMotivo}
            onChange={e => setPenalMotivo(e.target.value)}
            placeholder="Motivo"
          />
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-amber-700">{pontuacaoTotal.toFixed(2)} pts</p>
      </div>

      <Button onClick={() => setConfirming(true)} className="w-full bg-amber-700 hover:bg-amber-800 h-14 text-lg">
        Revisar e confirmar
      </Button>
    </div>
  )
}
