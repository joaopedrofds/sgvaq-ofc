import { createClient } from '@/lib/supabase/server'
import { ComprovanteReview } from '@/components/senhas/comprovante-review'

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const { data: pendentes } = await supabase
    .from('senhas')
    .select('*, competidores(nome, whatsapp), modalidades(nome, eventos(nome))')
    .eq('canal', 'online')
    .eq('comprovante_status', 'pendente')
    .order('created_at')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Financeiro — Comprovantes Pendentes</h1>
      {pendentes?.length === 0 ? (
        <p className="text-gray-500">Nenhum comprovante pendente.</p>
      ) : (
        <div className="space-y-4">
          {pendentes?.map(s => <ComprovanteReview key={s.id} senha={s} />)}
        </div>
      )}
    </div>
  )
}
