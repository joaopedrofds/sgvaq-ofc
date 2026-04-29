import { mockCompetidores } from '@/lib/mock/data'
import { UserPlus } from 'lucide-react'
import Link from 'next/link'
import { CompetidorList } from '@/components/competidores/competidor-list'

export default function CompetidoresPage() {
  const competidores = process.env.NEXT_PUBLIC_MOCK === 'true' ? mockCompetidores : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Competidores</h1>
        <Link
          href="/competidores/novo"
          className="inline-flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Novo competidor
        </Link>
      </div>

      <CompetidorList competidores={competidores} />
    </div>
  )
}