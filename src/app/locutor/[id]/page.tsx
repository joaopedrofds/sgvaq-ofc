import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Telao } from '@/components/locutor/telao'

export default async function LocutorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // id = modalidade_id
  const supabase = createAdminClient()

  const { data: modalidade } = await supabase
    .from('modalidades')
    .select('id, nome, eventos(nome, status)')
    .eq('id', id)
    .single()

  if (!modalidade) notFound()
  const evento = modalidade.eventos as any

  if (!['em_andamento', 'encerrado'].includes(evento?.status)) notFound()

  return (
    <Telao
      modalidadeId={modalidade.id}
      nomeEvento={evento.nome}
      nomeModalidade={modalidade.nome}
    />
  )
}
