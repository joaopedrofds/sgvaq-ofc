import Link from 'next/link'
import { Calendar, MapPin, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from './status-badge'
import type { EventoStatus } from '@/types'

interface EventoCardProps {
  id: string
  nome: string
  tipo: string
  data_inicio: string
  data_fim: string
  cidade: string
  estado: string
  status: EventoStatus
  modalidadesCount?: number
}

export function EventoCard({ id, nome, tipo, data_inicio, cidade, estado, status, modalidadesCount }: EventoCardProps) {
  return (
    <Link href={`/eventos/${id}`}>
      <Card className="hover:border-amber-400 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{nome}</CardTitle>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-gray-500 capitalize">{tipo}</p>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')}
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {cidade}/{estado}
          </div>
          {modalidadesCount !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {modalidadesCount} modalidade(s)
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
