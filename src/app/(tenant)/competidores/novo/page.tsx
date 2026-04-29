import { CompetidorForm } from '@/components/competidores/competidor-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NovoCompetidorPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/competidores"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Novo Competidor</h1>
      </div>
      <CompetidorForm />
    </div>
  )
}