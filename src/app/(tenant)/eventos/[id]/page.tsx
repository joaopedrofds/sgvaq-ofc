import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EventoForm } from '@/components/eventos/evento-form'
import { StatusBadge } from '@/components/eventos/status-badge'
import { StatusTransition } from '@/components/eventos/status-transition'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { EventoStatus } from '@/types'

export default async function EventoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: evento } = await supabase.from('eventos').select('*').eq('id', id).single()
  if (!evento) notFound()

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
              className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-start')}
            >
              Modalidades e critérios
            </Link>
            <Link
              href={`/eventos/${id}/senhas`}
              className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-start')}
            >
              Senhas vendidas
            </Link>
            <Link
              href={`/eventos/${id}/checkin`}
              className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-start')}
            >
              Check-in
            </Link>
            <Link
              href={`/eventos/${id}/ranking`}
              className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-start')}
            >
              Ranking
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
