'use client'
import { useRankingRealtime, useFilaRealtime } from '@/lib/realtime/hooks'

interface TelaoProps {
  modalidadeId: string
  nomeEvento: string
  nomeModalidade: string
}

export function Telao({ modalidadeId, nomeEvento, nomeModalidade }: TelaoProps) {
  const ranking = useRankingRealtime(modalidadeId)
  const fila = useFilaRealtime(modalidadeId)

  const atual = fila.find(f => f.status === 'chamado')
  const proximos = fila.filter(f => f.status === 'aguardando').slice(0, 3)
  const top5 = ranking.slice(0, 5)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 flex flex-col gap-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-amber-400">{nomeEvento}</h1>
        <p className="text-xl text-gray-400">{nomeModalidade}</p>
      </div>

      <div className="grid grid-cols-2 gap-8 flex-1">
        {/* Competidor atual */}
        <div className="space-y-6">
          <div className="bg-amber-900 rounded-2xl p-8 text-center">
            <p className="text-gray-300 text-lg mb-2">Na pista agora</p>
            <p className="text-5xl font-bold text-white">
              {atual ? (atual.senhas as any)?.competidores?.nome : '—'}
            </p>
            {atual && (
              <p className="text-2xl text-amber-300 mt-2">
                #{(atual.senhas as any)?.numero_senha?.toString().padStart(3, '0')}
              </p>
            )}
          </div>

          {proximos.length > 0 && (
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-3">Próximos</p>
              {proximos.map((f, i) => (
                <div key={f.id} className="flex items-center gap-3 py-2 border-b border-gray-800">
                  <span className="text-gray-500 w-6">{i + 1}</span>
                  <span className="text-lg">{(f.senhas as any)?.competidores?.nome}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ranking parcial */}
        <div className="bg-gray-900 rounded-2xl p-6">
          <p className="text-gray-400 text-sm mb-4 uppercase tracking-wider">Classificação parcial</p>
          {top5.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-4 py-3 border-b border-gray-800 ${i === 0 ? 'text-amber-300' : ''}`}>
              <span className={`text-3xl font-bold w-12 ${i === 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                {r.posicao}º
              </span>
              <div className="flex-1">
                <p className="text-xl font-semibold">{(r.competidores as any)?.nome}</p>
                <p className="text-sm text-gray-400">{r.total_passadas} passada(s)</p>
              </div>
              <span className={`text-2xl font-bold ${i === 0 ? 'text-amber-300' : 'text-white'}`}>
                {Number(r.total_pontos).toFixed(2)}
              </span>
            </div>
          ))}
          {top5.length === 0 && (
            <p className="text-gray-600 text-center py-8">Sem pontuações ainda</p>
          )}
        </div>
      </div>
    </div>
  )
}
