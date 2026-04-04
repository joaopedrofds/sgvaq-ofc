import { createClient } from '@/lib/supabase/server'
import { CaixaForm } from '@/components/senhas/caixa-form'
import { getSession } from '@/lib/auth/get-session'
import { notFound } from 'next/navigation'

export default async function SenhasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const supabase = await createClient()

  const { data: evento } = await supabase
    .from('eventos')
    .select('*, tenants(nome), modalidades(*)')
    .eq('id', id)
    .single()

  if (!evento) notFound()

  const modalidades = evento.modalidades ?? []

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Senhas — {evento.nome}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modalidades.map((m: any) => (
          <div key={m.id} className="bg-white border rounded-lg p-4">
            <p className="font-semibold">{m.nome}</p>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-green-600">{m.senhas_vendidas} vendidas</span>
              <span className="text-gray-500">{m.total_senhas - m.senhas_vendidas} disponíveis</span>
              <span className="text-red-500">0 canceladas</span>
            </div>
          </div>
        ))}
      </div>

      {evento.status !== 'encerrado' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Caixa — Venda Presencial</h2>
          <CaixaForm
            modalidades={modalidades.map((m: any) => ({ id: m.id, nome: m.nome, valor_senha: m.valor_senha }))}
            nomeEvento={evento.nome}
            dataEvento={evento.data_inicio}
            tenantId={session!.tenantId!}
            nomeOrganizadora={(evento.tenants as any)?.nome ?? ''}
          />
        </div>
      )}
    </div>
  )
}
