'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { requireRole } from '@/lib/auth/require-role'

export type CobrancaStatus = 'pendente' | 'pago' | 'isento'

export interface CobrancaSgvaq {
  id: string
  tenant_id: string
  mes: string // 'YYYY-MM'
  total_cobranca: number
  status: CobrancaStatus
  comprovante_url: string | null
  created_at: string
  updated_at: string
  tenant?: { nome: string; slug: string }
}

export async function calcularCobrancaMensal(
  tenantId: string,
  mes: string // 'YYYY-MM'
): Promise<{ totalCobranca: number; porEvento: Record<string, number> }> {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const supabase = await createClient()
  const [year, month] = mes.split('-').map(Number)
  const start = new Date(year, month - 1, 1).toISOString()
  const end = new Date(year, month, 1).toISOString()

  const { data, error } = await supabase
    .from('financeiro_transacoes')
    .select('taxa_sgvaq, evento_id')
    .eq('tenant_id', tenantId)
    .gte('created_at', start)
    .lt('created_at', end)

  if (error) throw new Error(error.message)

  const transacoes = data as { taxa_sgvaq: number; evento_id: string }[]
  const totalCobranca = transacoes.reduce((acc, t) => acc + t.taxa_sgvaq, 0)
  const porEvento: Record<string, number> = {}
  for (const t of transacoes) {
    porEvento[t.evento_id] = (porEvento[t.evento_id] ?? 0) + t.taxa_sgvaq
  }

  return { totalCobranca, porEvento }
}

export async function criarCobranca(tenantId: string, mes: string): Promise<CobrancaSgvaq> {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const { totalCobranca } = await calcularCobrancaMensal(tenantId, mes)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cobrancas_sgvaq')
    .insert({ tenant_id: tenantId, mes, total_cobranca: totalCobranca, status: 'pendente' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as CobrancaSgvaq
}

export async function atualizarStatusCobranca(
  cobrancaId: string,
  status: CobrancaStatus,
  comprovanteBase64?: string
): Promise<void> {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const supabase = await createClient()
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }

  if (comprovanteBase64) {
    const filename = `cobrancas/${cobrancaId}/comprovante-${Date.now()}.pdf`
    const buffer = Buffer.from(comprovanteBase64, 'base64')
    const { error: uploadError } = await supabase.storage
      .from('comprovantes')
      .upload(filename, buffer, { contentType: 'application/pdf', upsert: true })
    if (uploadError) throw new Error(uploadError.message)
    updates.comprovante_url = filename
  }

  const { error } = await supabase
    .from('cobrancas_sgvaq')
    .update(updates)
    .eq('id', cobrancaId)

  if (error) throw new Error(error.message)
}

export async function listarCobrancas(
  filters: { tenantId?: string; mes?: string; status?: CobrancaStatus } = {}
): Promise<CobrancaSgvaq[]> {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const supabase = await createClient()
  let query = supabase
    .from('cobrancas_sgvaq')
    .select('*, tenant:tenants(nome, slug)')
    .order('mes', { ascending: false })

  if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId) as any
  if (filters.mes) query = query.eq('mes', filters.mes) as any
  if (filters.status) query = query.eq('status', filters.status) as any

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as CobrancaSgvaq[]
}

export async function gerarPdfCobranca(cobrancaId: string): Promise<{ base64: string; filename: string }> {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const supabase = await createClient()
  const { data: cobranca, error } = await supabase
    .from('cobrancas_sgvaq')
    .select('*, tenant:tenants(nome, slug)')
    .eq('id', cobrancaId)
    .single()
  if (error) throw new Error(error.message)

  const { totalCobranca, porEvento } = await calcularCobrancaMensal(cobranca.tenant_id, cobranca.mes)
  const eventoIds = Object.keys(porEvento)
  const { data: eventos } = await supabase
    .from('eventos')
    .select('id, nome, data_inicio')
    .in('id', eventoIds)

  const eventosFormatted = (eventos ?? []).map((ev: any) => ({
    nome: ev.nome,
    data_inicio: ev.data_inicio,
    resumo: {
      totalBruto: 0,
      totalTaxaSgvaq: porEvento[ev.id] ?? 0,
    }
  }))

  const React = await import('react')
  const { RelatorioCobrancaDocument } = await import('@/components/financeiro/RelatorioCobrancaDocument')
  const { renderToBuffer } = await import('@/lib/pdf/render-to-buffer')

  const buffer = await renderToBuffer(
    React.default.createElement(RelatorioCobrancaDocument, {
      tenant: cobranca.tenant,
      mes: cobranca.mes,
      eventos: eventosFormatted,
      totalCobranca
    })
  )

  return {
    base64: buffer.toString('base64'),
    filename: `cobranca-sgvaq-${cobranca.tenant.slug}-${cobranca.mes}.pdf`
  }
}
