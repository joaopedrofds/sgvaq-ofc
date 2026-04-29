import { getEventos } from '@/actions/eventos'
import { EventoCard } from '@/components/eventos/evento-card'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { EventoStatus } from '@/types'

export default async function EventosPage() {
  const result = await getEventos()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
        <a
          href="/eventos/novo"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-amber-700 hover:bg-amber-800 text-sm font-medium h-8 gap-1.5 px-2.5 text-white transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo evento
        </a>
      </div>
      {'error' in (result ?? {}) ? (
        <p className="text-red-500">{(result as any).error}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {result.data?.map(evento => (
            <EventoCard
              key={evento.id}
              id={evento.id}
              nome={evento.nome}
              tipo={evento.tipo}
              data_inicio={evento.data_inicio}
              data_fim={evento.data_fim}
              cidade={evento.cidade ?? ''}
              estado={evento.estado ?? ''}
              status={evento.status as EventoStatus}
            />
          ))}
          {result.data?.length === 0 && (
            <p className="col-span-3 text-gray-500 text-center py-12">Nenhum evento criado ainda.</p>
          )}
        </div>
      )}
    </div>
  )
}
