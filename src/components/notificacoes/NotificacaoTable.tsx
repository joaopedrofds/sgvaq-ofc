'use client'
import { useState, useTransition } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2 } from 'lucide-react'
import { reenviarNotificacao } from '@/actions/notificacoes'
import type { NotificacaoFila } from '@/actions/notificacoes'
import { useRouter } from 'next/navigation'

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pendente: 'outline',
  processando: 'secondary',
  retry: 'default',
  enviado: 'secondary',
  falhou: 'destructive'
}

const statusLabel: Record<string, string> = {
  pendente: 'Pendente',
  processando: 'Processando',
  retry: 'Retry',
  enviado: 'Enviado',
  falhou: 'Falhou'
}

interface Props {
  notificacoes: NotificacaoFila[]
}

export function NotificacaoTable({ notificacoes }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [retrying, setRetrying] = useState<string | null>(null)

  async function handleReenviar(id: string) {
    setRetrying(id)
    try {
      await reenviarNotificacao(id)
      startTransition(() => router.refresh())
    } finally {
      setRetrying(null)
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tenant</TableHead>
          <TableHead>Destinatário</TableHead>
          <TableHead>Mensagem</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Tentativas</TableHead>
          <TableHead>Erro</TableHead>
          <TableHead>Ação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notificacoes.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              Nenhuma notificação com falha
            </TableCell>
          </TableRow>
        )}
        {notificacoes.map(n => (
          <TableRow key={n.id}>
            <TableCell className="text-sm font-medium">{(n.tenant as any)?.nome ?? n.tenant_id.slice(0, 8)}</TableCell>
            <TableCell className="font-mono text-sm">{n.destinatario_telefone}</TableCell>
            <TableCell className="text-sm max-w-xs truncate" title={n.mensagem}>{n.mensagem}</TableCell>
            <TableCell>
              <Badge variant={statusVariant[n.status] ?? 'outline'}>{statusLabel[n.status] ?? n.status}</Badge>
            </TableCell>
            <TableCell className="text-center">{n.tentativas}</TableCell>
            <TableCell className="text-sm text-destructive max-w-xs truncate" title={n.erro ?? ''}>
              {n.erro ?? '—'}
            </TableCell>
            <TableCell>
              {n.status === 'falhou' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReenviar(n.id)}
                  disabled={retrying === n.id || pending}
                >
                  {retrying === n.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
