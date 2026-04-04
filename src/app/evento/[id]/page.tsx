import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { formatMoney } from '@/lib/utils/money'
import { StatusBadge } from '@/components/eventos/status-badge'
import { Calendar, MapPin, Trophy } from 'lucide-react'
import Link from 'next/link'
import type { EventoStatus } from '@/types'

export default async function PublicEventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { data: evento } = await supabase
    .from('eventos')
    .select('*, modalidades(*)')
    .eq('id', id)
    .in('status', ['aberto', 'em_andamento', 'encerrado'])
    .single()

  if (!evento) notFound()

  return (
    <main className="min-h-screen bg-amber-50">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-amber-900">{evento.nome}</h1>
            <StatusBadge status={evento.status as EventoStatus} />
          </div>
          <div className="flex gap-4 text-gray-600 text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(evento.data_inicio).toLocaleDateString('pt-BR')}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {evento.cidade}/{evento.estado}
            </span>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-amber-900 mb-4">Modalidades</h2>
          <div className="grid gap-4">
            {evento.modalidades?.map((m: any) => (
              <div key={m.id} className="bg-white rounded-lg border p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">{m.nome}</h3>
                  <span className="text-xl font-bold text-amber-700">{formatMoney(m.valor_senha)}</span>
                </div>
                <p className="text-sm text-gray-500">{m.senhas_vendidas}/{m.total_senhas} senhas vendidas</p>
                {m.premiacao_descricao && (
                  <p className="text-sm flex items-center gap-1 text-amber-700">
                    <Trophy className="h-4 w-4" />{m.premiacao_descricao}
                  </p>
                )}
                {evento.status === 'aberto' && m.senhas_vendidas < m.total_senhas && (
                  <Link
                    href={`/evento/${id}/inscricao?modalidade=${m.id}`}
                    className="block w-full text-center bg-amber-700 hover:bg-amber-800 text-white py-2 rounded-md text-sm font-medium mt-2"
                  >
                    Comprar senha
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
