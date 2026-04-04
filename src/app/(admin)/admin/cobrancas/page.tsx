import { listarCobrancas } from '@/actions/cobrancas'
import { CobrancaStatusBadge } from '@/components/financeiro/CobrancaStatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavos / 100)
}

export default async function CobrancasPage() {
  const cobrancas = await listarCobrancas()

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Cobranças SGVAQ</h1>
      <div className="space-y-3">
        {cobrancas.length === 0 && (
          <p className="text-muted-foreground text-center py-8">Nenhuma cobrança registrada.</p>
        )}
        {cobrancas.map(c => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{(c.tenant as any)?.nome ?? c.tenant_id}</p>
                <p className="text-sm text-muted-foreground">{c.mes}</p>
              </div>
              <div className="flex items-center gap-4">
                <CobrancaStatusBadge status={c.status} />
                <p className="font-bold text-lg">{formatBRL(c.total_cobranca)}</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/cobrancas/${c.id}`}>Detalhes</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
