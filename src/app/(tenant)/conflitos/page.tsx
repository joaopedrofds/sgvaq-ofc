import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { mockPassadasConflitos } from '@/lib/mock/data'

export default function ConflitosPage() {
  const conflitos = process.env.NEXT_PUBLIC_MOCK === 'true' ? mockPassadasConflitos : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Conflitos de Sincronização</h1>
        {conflitos.length > 0 && (
          <span className="bg-red-100 text-red-700 text-sm font-medium px-3 py-1 rounded-full">
            {conflitos.length} pendente(s)
          </span>
        )}
      </div>

      {conflitos.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum conflito de sincronização registrado.</p>
          <p className="text-gray-400 text-sm mt-1">
            Conflitos ocorrem quando duas pontuações offline são registradas para a mesma passada.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {conflitos.map(conf => (
            <div key={conf.id} className="bg-white border border-red-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium">Conflito na passada #{conf.dados_conflito.numero_passada}</p>
                    <p className="text-sm text-gray-500">Senha: {conf.dados_conflito.senha_id}</p>
                  </div>
                </div>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                  {conf.resolvido ? 'Resolvido' : 'Pendente'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 rounded-lg p-3">
                <div>
                  <p className="text-gray-500 mb-1">Original</p>
                  <p className="font-medium">{conf.dados_conflito.pontuacao_original} pts</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {new Date(conf.dados_conflito.criado_em_local_original).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Conflitante</p>
                  <p className="font-medium">{conf.dados_conflito.pontuacao_conflitante} pts</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {new Date(conf.dados_conflito.criado_em_local_conflitante).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              {!conf.resolvido && (
                <div className="flex gap-2">
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-md text-sm font-medium">
                    Manter original
                  </button>
                  <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-md text-sm font-medium">
                    Usar conflitante
                  </button>
                  <button className="border border-gray-300 px-4 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                    Revisar detalhes
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}