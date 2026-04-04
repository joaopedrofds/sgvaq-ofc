import { createClient } from '@/lib/supabase/server'
import { CheckinPanel } from '@/components/checkin/checkin-panel'
import { notFound } from 'next/navigation'

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: evento } = await supabase
    .from('eventos')
    .select('nome, status, modalidades(id, nome)')
    .eq('id', id)
    .single()

  if (!evento) notFound()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Check-in — {evento.nome}</h1>
      {evento.modalidades?.map((m: any) => (
        <div key={m.id} className="border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold">{m.nome}</h2>
          <CheckinPanel modalidadeId={m.id} eventoId={id} />
        </div>
      ))}
    </div>
  )
}
