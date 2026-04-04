import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { PontuacaoForm } from '@/components/pontuacao/pontuacao-form'
import { OfflineIndicator } from '@/components/pontuacao/offline-indicator'
import { notFound } from 'next/navigation'

export default async function PontuacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const supabase = await createClient()

  const { data: evento } = await supabase
    .from('eventos')
    .select('nome, tipo, status, modalidades(id, nome, criterios_pontuacao:modalidade_criterios(criterio_id, criterios_pontuacao(*)))')
    .eq('id', id)
    .single()

  if (!evento || evento.status !== 'em_andamento') notFound()

  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('user_id', session!.id)
    .single()

  // Pega o próximo competidor na fila (status: chamado)
  const { data: filaAtual } = await supabase
    .from('fila_entrada')
    .select('*, senhas(id, numero_passada:passadas(count), competidores(nome))')
    .eq('modalidade_id', evento.modalidades?.[0]?.id ?? '')
    .eq('status', 'chamado')
    .limit(1)
    .single()

  return (
    <div className="max-w-sm mx-auto py-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-bold">Pontuação — {evento.nome}</h1>
        <OfflineIndicator />
      </div>

      {filaAtual ? (
        <PontuacaoForm
          senhaId={(filaAtual.senhas as any)?.id ?? ''}
          modalidadeId={filaAtual.modalidade_id}
          juizId={tenantUser?.id ?? ''}
          numeroPassada={((filaAtual.senhas as any)?.numero_passada ?? 0) + 1}
          nomeCompetidor={(filaAtual.senhas as any)?.competidores?.nome ?? ''}
          criterios={evento.modalidades?.[0]?.criterios_pontuacao?.map((mc: any) => mc.criterios_pontuacao) ?? []}
          isOnline={true}
        />
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>Aguardando próximo competidor ser chamado...</p>
        </div>
      )}
    </div>
  )
}
