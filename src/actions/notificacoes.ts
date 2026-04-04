'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { requireRole } from '@/lib/auth/require-role'

export interface NotificacaoFila {
  id: string
  tenant_id: string
  status: 'pendente' | 'processando' | 'retry' | 'enviado' | 'falhou'
  destinatario_telefone: string
  mensagem: string
  tentativas: number
  erro: string | null
  created_at: string
  updated_at: string | null
  tenant?: { nome: string }
}

export async function listarNotificacoesFalhas(limit = 100): Promise<NotificacaoFila[]> {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notificacoes_fila')
    .select('*, tenant:tenants(nome)')
    .eq('status', 'falhou')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data as NotificacaoFila[]
}

export async function listarTodasNotificacoes(
  filters: { status?: string; tenantId?: string } = {},
  limit = 100
): Promise<NotificacaoFila[]> {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const supabase = await createClient()
  let query = supabase
    .from('notificacoes_fila')
    .select('*, tenant:tenants(nome)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filters.status) query = query.eq('status', filters.status) as any
  if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId) as any

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as NotificacaoFila[]
}

export async function reenviarNotificacao(notificacaoId: string): Promise<void> {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const supabase = await createClient()
  const { error } = await supabase
    .from('notificacoes_fila')
    .update({
      status: 'pendente',
      tentativas: 0,
      proximo_retry_em: null,
      erro: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', notificacaoId)

  if (error) throw new Error(error.message)
}
