import { cn } from '@/lib/utils'
import type { EventoStatus } from '@/types'

const statusConfig: Record<EventoStatus, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700' },
  aberto: { label: 'Aberto', className: 'bg-green-100 text-green-700' },
  em_andamento: { label: 'Em andamento', className: 'bg-blue-100 text-blue-700' },
  encerrado: { label: 'Encerrado', className: 'bg-red-100 text-red-700' },
}

export function StatusBadge({ status }: { status: EventoStatus }) {
  const config = statusConfig[status]
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.className)}>
      {config.label}
    </span>
  )
}
