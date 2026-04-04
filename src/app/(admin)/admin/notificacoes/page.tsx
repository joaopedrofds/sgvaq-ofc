import { listarTodasNotificacoes } from '@/actions/notificacoes'
import { NotificacaoTable } from '@/components/notificacoes/NotificacaoTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PageProps {
  searchParams: { status?: string }
}

export default async function NotificacoesAdminPage({ searchParams }: PageProps) {
  const notificacoes = await listarTodasNotificacoes({ status: searchParams.status }, 200)
  const falhas = notificacoes.filter(n => n.status === 'falhou').length
  const enviadas = notificacoes.filter(n => n.status === 'enviado').length
  const pendentes = notificacoes.filter(n => ['pendente', 'retry'].includes(n.status)).length

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Notificações WhatsApp</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pendentes</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{pendentes}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Enviadas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{enviadas}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Falhas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{falhas}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Todas as Notificações</CardTitle></CardHeader>
        <CardContent>
          <NotificacaoTable notificacoes={notificacoes} />
        </CardContent>
      </Card>
    </div>
  )
}
