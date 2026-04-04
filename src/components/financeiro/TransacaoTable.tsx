'use client'
import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { FinanceiroTransacao } from '@/actions/financeiro'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavos / 100)
}

interface Props {
  transacoes: FinanceiroTransacao[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function TransacaoTable({ transacoes, total, page, pageSize, onPageChange }: Props) {
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/Hora</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Taxa SGVAQ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transacoes.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                Nenhuma transação registrada
              </TableCell>
            </TableRow>
          )}
          {transacoes.map(t => (
            <TableRow key={t.id} className={t.tipo === 'cancelamento' ? 'opacity-60' : ''}>
              <TableCell className="text-sm">
                {new Date(t.created_at).toLocaleString('pt-BR')}
              </TableCell>
              <TableCell>
                <Badge variant={t.tipo === 'cancelamento' ? 'destructive' : 'default'}>
                  {t.tipo === 'cancelamento' ? 'Cancelamento' : 'Venda'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{t.descricao ?? '—'}</TableCell>
              <TableCell className={`text-right font-mono ${t.valor < 0 ? 'text-destructive' : ''}`}>
                {formatBRL(t.valor)}
              </TableCell>
              <TableCell className={`text-right font-mono text-sm ${t.taxa_sgvaq < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {formatBRL(t.taxa_sgvaq)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {total} transações — página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
