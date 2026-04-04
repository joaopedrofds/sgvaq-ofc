'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { checkinManual } from '@/actions/checkin'
import { useRouter } from 'next/navigation'

export function CheckinPanel({ modalidadeId }: { modalidadeId: string; eventoId: string }) {
  const [numero, setNumero] = useState('')
  const [result, setResult] = useState<{ success?: boolean; error?: string; competidor?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleCheckin() {
    setLoading(true)
    const res = await checkinManual(parseInt(numero), modalidadeId)
    setResult(res)
    if (res.success) { setNumero(''); router.refresh() }
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="number"
          value={numero}
          onChange={e => setNumero(e.target.value)}
          placeholder="Número da senha"
          onKeyDown={e => { if (e.key === 'Enter') handleCheckin() }}
          className="max-w-xs"
        />
        <Button onClick={handleCheckin} disabled={!numero || loading} className="bg-amber-700 hover:bg-amber-800">
          {loading ? '...' : 'Check-in'}
        </Button>
      </div>
      {result?.success && (
        <p className="text-green-600 text-sm">✅ Check-in realizado — {result.competidor}</p>
      )}
      {result?.error && (
        <p className="text-red-600 text-sm">❌ {result.error}</p>
      )}
    </div>
  )
}
