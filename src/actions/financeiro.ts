'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { requireRole } from '@/lib/auth/require-role'
import React from 'react'
import { renderToBuffer } from '@/lib/pdf/render-to-buffer'
import { RelatorioCaixaDocument } from '@/components/financeiro/RelatorioCaixaDocument'
import { FolhasPremiacaoDocument } from '@/components/financeiro/FolhasPremiacaoDocument'

export interface ResumoFinanceiro {
  totalBruto: number        // centavos
  totalTaxaSgvaq: number    // centavos
  quantidadeVendas: number
  quantidadeCancelamentos: number
  transacoes: FinanceiroTransacao[]
}

export interface FinanceiroTransacao {
  id: string
  tipo: 'venda' | 'cancelamento'
  valor: number
  taxa_sgvaq: number
  descricao: string | null
  created_at: string
  senha_id: string | null
  evento_id: string
}

export function calcularResumoDeTransacoes(transacoes: FinanceiroTransacao[]): Omit<ResumoFinanceiro, 'transacoes'> {
  const totalBruto = transacoes.reduce((acc, t) => acc + t.valor, 0)
  const totalTaxaSgvaq = transacoes.reduce((acc, t) => acc + (t.taxa_sgvaq ?? 0), 0)
  const quantidadeVendas = transacoes.filter(t => t.tipo === 'venda').length
  const quantidadeCancelamentos = transacoes.filter(t => t.tipo === 'cancelamento').length
  return { totalBruto, totalTaxaSgvaq, quantidadeVendas, quantidadeCancelamentos }
}

export async function listarTransacoes(
  eventoId: string,
  page = 0,
  pageSize = 50
): Promise<{ data: FinanceiroTransacao[]; count: number }> {
  const session = await getSession()
  requireRole(session, ['organizador', 'financeiro'])

  const supabase = await createClient()
  const from = page * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('financeiro_transacoes')
    .select('*', { count: 'exact' })
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)
  return { data: data as FinanceiroTransacao[], count: count ?? 0 }
}

export async function calcularResumoFinanceiro(eventoId: string): Promise<ResumoFinanceiro> {
  const session = await getSession()
  requireRole(session, ['organizador', 'financeiro'])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('financeiro_transacoes')
    .select('*')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const transacoes = data as FinanceiroTransacao[]
  return { ...calcularResumoDeTransacoes(transacoes), transacoes }
}

export async function gerarPdfRelatorioCaixa(eventoId: string): Promise<{ base64: string; filename: string }> {
  const session = await getSession()
  requireRole(session, ['organizador', 'financeiro'])

  const supabase = await createClient()
  const { data: evento, error: evErr } = await supabase
    .from('eventos')
    .select('id, nome, data_inicio, data_fim, local')
    .eq('id', eventoId)
    .single()
  if (evErr) throw new Error(evErr.message)

  const resumo = await calcularResumoFinanceiro(eventoId)

  const buffer = await renderToBuffer(
    React.createElement(RelatorioCaixaDocument, {
      evento,
      resumo,
      geradoEm: new Date().toISOString()
    })
  )

  const slug = evento.nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return {
    base64: buffer.toString('base64'),
    filename: `relatorio-caixa-${slug}-${evento.data_inicio}.pdf`
  }
}

export async function gerarPdfFolhaPremiacao(
  eventoId: string,
  modalidadeId: string
): Promise<{ base64: string; filename: string }> {
  const session = await getSession()
  requireRole(session, ['organizador', 'financeiro'])

  const supabase = await createClient()

  const { data: evento } = await supabase
    .from('eventos')
    .select('nome, data_inicio')
    .eq('id', eventoId)
    .single()

  const { data: modalidade } = await supabase
    .from('modalidades')
    .select('nome')
    .eq('id', modalidadeId)
    .single()

  const { data: ranking } = await supabase
    .from('ranking')
    .select('posicao, pontuacao_total, senhas(numero_senha, competidores(nome))')
    .eq('modalidade_id', modalidadeId)
    .order('posicao', { ascending: true })

  const rankingFormatted = (ranking ?? []).map((r: any) => ({
    posicao: r.posicao,
    pontuacao_total: r.pontuacao_total,
    numero_senha: r.senhas?.numero_senha?.toString() ?? '—',
    competidor_nome: r.senhas?.competidores?.nome ?? '—'
  }))

  const buffer = await renderToBuffer(
    React.createElement(FolhasPremiacaoDocument, {
      evento: evento!,
      modalidade: modalidade!,
      ranking: rankingFormatted
    })
  )

  return {
    base64: buffer.toString('base64'),
    filename: `premiacao-${modalidade!.nome.toLowerCase().replace(/\s+/g, '-')}.pdf`
  }
}
