import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EventoForm } from '@/components/eventos/evento-form'
import { StatusBadge } from '@/components/eventos/status-badge'
import { StatusTransition } from '@/components/eventos/status-transition'
import Link from 'next/link'
import type { EventoStatus } from '@/types'
import { mockEventos } from '@/lib/mock/data'

export default async function EventoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let evento: any
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    evento = mockEventos.find(e => e.id === id)
    if (!evento) notFound()
  } else {
    const supabase = await createClient()
    const { data } = await supabase.from('eventos').select('*').eq('id', id).single()
    if (!data) notFound()
    evento = data
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{evento.nome}</h1>
          <StatusBadge status={evento.status as EventoStatus} />
        </div>
        <StatusTransition eventoId={id} currentStatus={evento.status as EventoStatus} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Editar dados</h2>
          <EventoForm eventoId={id} defaultValues={evento} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Ações</h2>
          <div className="space-y-2">
            <Link
              href={`/eventos/${id}/modalidades`}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted h-8 gap-1.5 px-2.5 text-sm font-medium w-full"
            >
              Modalidades e critérios
            </Link>
            <Link
              href={`/eventos/${id}/senhas`}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted h-8 gap-1.5 px-2.5 text-sm font-medium w-full"
            >
              Senhas vendidas
            </Link>
            <Link
              href={`/eventos/${id}/checkin`}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted h-8 gap-1.5 px-2.5 text-sm font-medium w-full"
            >
              Check-in
            </Link>
            <Link
              href={`/eventos/${id}/ranking`}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted h-8 gap-1.5 px-2.5 text-sm font-medium w-full"
            >
              Ranking
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}