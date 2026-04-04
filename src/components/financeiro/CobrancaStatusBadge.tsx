import { Badge } from '@/components/ui/badge'
import type { CobrancaStatus } from '@/actions/cobrancas'

const variants: Record<CobrancaStatus, 'default' | 'secondary' | 'outline'> = {
  pendente: 'default',
  pago: 'secondary',
  isento: 'outline'
}

const labels: Record<CobrancaStatus, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  isento: 'Isento'
}

export function CobrancaStatusBadge({ status }: { status: CobrancaStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}
