import { createClient } from '@/lib/supabase/server'
import { getModalidades } from '@/actions/modalidades'
import { ModalidadeForm } from '@/components/eventos/modalidade-form'
import { formatMoney } from '@/lib/utils/money'

export default async function ModalidadesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: evento } = await supabase.from('eventos').select('tipo, nome').eq('id', id).single()
  const { data: modalidades } = await getModalidades(id)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Modalidades — {evento?.nome}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modalidades?.map(m => (
          <div key={m.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <h3 className="font-semibold">{m.nome}</h3>
              <span className="text-sm text-gray-500">{formatMoney(m.valor_senha)}/senha</span>
            </div>
            <p className="text-sm text-gray-600">{m.total_senhas} senhas | {m.senhas_vendidas} vendidas</p>
            {m.premiacao_descricao && <p className="text-xs text-amber-700">{m.premiacao_descricao}</p>}
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-4">Adicionar modalidade</h2>
        <ModalidadeForm eventoId={id} tipoProva={evento?.tipo as 'vaquejada' | 'tambor'} />
      </div>
    </div>
  )
}
