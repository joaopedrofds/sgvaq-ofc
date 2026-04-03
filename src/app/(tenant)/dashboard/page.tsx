import { getSession } from '@/lib/auth/get-session'

export default async function DashboardPage() {
  const session = await getSession()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Bem-vindo, {session?.email}. Role: <strong>{session?.role}</strong>
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['Eventos ativos', 'Senhas vendidas', 'Competidores'].map(label => (
          <div key={label} className="bg-white rounded-lg border p-6">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-3xl font-bold mt-1 text-gray-900">—</p>
          </div>
        ))}
      </div>
    </div>
  )
}
