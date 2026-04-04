import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function RankingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: evento } = await supabase
    .from('eventos')
    .select('nome, modalidades(id, nome)')
    .eq('id', id)
    .single()

  if (!evento) notFound()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ranking — {evento.nome}</h1>
      {evento.modalidades?.map((m: any) => (
        <div key={m.id} className="border rounded-lg p-4">
          <h2 className="font-semibold mb-4">{m.nome}</h2>
          <p className="text-sm text-gray-500">
            Acesse o telão em{' '}
            <a href={`/locutor/${m.id}`} target="_blank" rel="noreferrer" className="text-amber-700 underline">
              /locutor/{m.id}
            </a>
          </p>
        </div>
      ))}
    </div>
  )
}
