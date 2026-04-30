import { getSession } from '@/lib/auth/get-session'
import { mockEventos, mockSenhas, mockCompetidores, mockTransacoes } from '@/lib/mock/data'
import Link from 'next/link'
import { Calendar, Ticket, Users, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

export default async function DashboardPage() {
  const session = await getSession()

  // Em modo mock, calcula métricas dos dados mock
  let eventosAtivos = 0
  let senhasVendidas = 0
  let totalCompetidores = 0
  let receitaBruta = 0

  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    eventosAtivos = mockEventos.filter(e => e.status === 'em_andamento' || e.status === 'aberto').length
    senhasVendidas = mockSenhas.filter(s => s.status !== 'cancelada').length
    totalCompetidores = mockCompetidores.length
    receitaBruta = mockTransacoes.filter(t => t.tipo === 'venda').reduce((acc, t) => acc + t.valor, 0)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Bem-vindo, {session?.email}. Role: <strong>{session?.role}</strong>
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <Calendar className="h-5 w-5" />
            <p className="text-sm text-gray-500">Eventos ativos</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{eventosAtivos}</p>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <Ticket className="h-5 w-5" />
            <p className="text-sm text-gray-500">Senhas vendidas</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{senhasVendidas}</p>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <Users className="h-5 w-5" />
            <p className="text-sm text-gray-500">Competidores</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalCompetidores}</p>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <DollarSign className="h-5 w-5" />
            <p className="text-sm text-gray-500">Receita bruta</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatBRL(receitaBruta)}</p>
        </div>
      </div>

      {/* Eventos recentes */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Eventos recentes</h2>
        {process.env.NEXT_PUBLIC_MOCK === 'true' ? (
          <div className="space-y-3">
            {mockEventos.slice(0, 3).map(evento => (
              <Link key={evento.id} href={`/eventos/${evento.id}`} className="block border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{evento.nome}</p>
                    <p className="text-sm text-gray-500">{evento.cidade}/{evento.estado} • {new Date(evento.data_inicio).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    evento.status === 'em_andamento' ? 'bg-green-100 text-green-700' :
                    evento.status === 'aberto' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {evento.status === 'em_andamento' ? 'Em andamento' :
                     evento.status === 'aberto' ? 'Aberto' :
                     evento.status === 'rascunho' ? 'Rascunho' : 'Encerrado'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Nenhum evento encontrado.</p>
        )}
      </div>
    </div>
  )
}