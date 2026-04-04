import { createClient } from '@/lib/supabase/server'
import { ComprovanteReview } from '@/components/senhas/comprovante-review'
import { TransacaoTable } from '@/components/financeiro/TransacaoTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavos / 100)
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: { evento_id?: string; page?: string }
}) {
  const supabase = await createClient()

  // Comprovantes pendentes (always shown)
  const { data: pendentes } = await supabase
    .from('senhas')
    .select('*, competidores(nome, whatsapp), modalidades(nome, eventos(nome))')
    .eq('canal', 'online')
    .eq('comprovante_status', 'pendente')
    .order('created_at')

  const eventoId = searchParams.evento_id
  const page = Number(searchParams.page ?? 0)

  let transacoes: any[] = []
  let count = 0
  let resumo = { totalBruto: 0, totalTaxaSgvaq: 0, quantidadeVendas: 0, quantidadeCancelamentos: 0 }

  if (eventoId) {
    const { data: txData, count: txCount } = await supabase
      .from('financeiro_transacoes')
      .select('*', { count: 'exact' })
      .eq('evento_id', eventoId)
      .order('created_at', { ascending: false })
      .range(page * 50, page * 50 + 49)

    transacoes = txData ?? []
    count = txCount ?? 0
    resumo = {
      totalBruto: transacoes.reduce((a: number, t: any) => a + t.valor, 0),
      totalTaxaSgvaq: transacoes.reduce((a: number, t: any) => a + (t.taxa_sgvaq ?? 0), 0),
      quantidadeVendas: transacoes.filter((t: any) => t.tipo === 'venda').length,
      quantidadeCancelamentos: transacoes.filter((t: any) => t.tipo === 'cancelamento').length,
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Financeiro</h1>

      {/* Comprovantes pendentes */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Comprovantes Pendentes</h2>
        {!pendentes?.length ? (
          <p className="text-gray-500 text-sm">Nenhum comprovante pendente.</p>
        ) : (
          <div className="space-y-4">
            {pendentes.map(s => <ComprovanteReview key={s.id} senha={s} />)}
          </div>
        )}
      </section>

      {/* Audit log */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Transações</h2>
          {eventoId && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/financeiro/relatorio?evento_id=${eventoId}`}>
                <FileDown className="w-4 h-4 mr-1" /> Relatório PDF
              </Link>
            </Button>
          )}
        </div>

        {!eventoId ? (
          <p className="text-sm text-gray-500">Selecione um evento via <code>?evento_id=</code> para ver as transações.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Receita Bruta</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{formatBRL(resumo.totalBruto)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Taxa SGVAQ</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-muted-foreground">{formatBRL(resumo.totalTaxaSgvaq)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Vendas</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{resumo.quantidadeVendas}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Cancelamentos</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-destructive">{resumo.quantidadeCancelamentos}</p></CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Transações</CardTitle></CardHeader>
              <CardContent>
                <TransacaoTable
                  transacoes={transacoes}
                  total={count}
                  page={page}
                  pageSize={50}
                  onPageChange={() => {}}
                />
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </div>
  )
}
