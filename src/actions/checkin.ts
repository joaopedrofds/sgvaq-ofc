'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { requireRole } from '@/lib/auth/require-role'
import { revalidatePath } from 'next/cache'
import { mockFila, mockSenhas } from '@/lib/mock/data'

export async function parseQRCode(raw: string): Promise<{ senha_id: string; tenant_id: string } | null> {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed.senha_id || !parsed.tenant_id) return null
    return { senha_id: parsed.senha_id, tenant_id: parsed.tenant_id }
  } catch {
    return null
  }
}

export async function fazerCheckin(senhaId: string, tenantIdQR: string) {
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    return { success: true, competidor: 'Competidor Mock' }
  }
  const session = await getSession()
  requireRole(session, ['financeiro', 'organizador'])

  // Validar que o tenant do QR bate com o tenant do usuário
  if (session!.tenantId !== tenantIdQR) {
    return { error: 'QR Code não pertence a este evento' }
  }

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: senha } = await supabase
    .from('senhas')
    .select('status, modalidade_id, competidores(nome)')
    .eq('id', senhaId)
    .single()

  if (!senha) return { error: 'Senha não encontrada' }
  if (senha.status === 'cancelada') return { error: 'Senha cancelada' }
  if (senha.status === 'checkin_feito') return { error: 'Check-in já realizado para esta senha' }
  if (senha.status === 'pendente') return { error: 'Senha pendente de aprovação' }

  // Atualizar status da senha
  const { error: updateError } = await supabase
    .from('senhas')
    .update({ status: 'checkin_feito' })
    .eq('id', senhaId)

  if (updateError) return { error: updateError.message }

  // Adicionar à fila atomicamente
  const { error: filaError } = await admin.rpc('assign_fila_posicao', {
    p_modalidade_id: senha.modalidade_id,
    p_senha_id: senhaId,
  })

  if (filaError) return { error: filaError.message }

  revalidatePath('/eventos')
  return {
    success: true,
    competidor: (senha.competidores as any)?.nome,
  }
}

export async function checkinManual(numeroSenha: number, modalidadeId: string) {
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    return { success: true, competidor: 'Competidor Mock' }
  }
  const supabase = await createClient()
  const { data: senha } = await supabase
    .from('senhas')
    .select('id, modalidades(tenant_id:eventos(tenant_id))')
    .eq('numero_senha', numeroSenha)
    .eq('modalidade_id', modalidadeId)
    .eq('status', 'ativa')
    .single()

  if (!senha) return { error: 'Senha não encontrada ou já usada' }

  const session = await getSession()
  return fazerCheckin(senha.id, session!.tenantId!)
}

export async function getFila(modalidadeId: string) {
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    const data = mockFila.filter(f => f.modalidade_id === modalidadeId)
    return { data }
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fila_entrada')
    .select('*, senhas(numero_senha, competidores(nome, whatsapp))')
    .eq('modalidade_id', modalidadeId)
    .order('ordem_atual')

  if (error) return { error: error.message }
  return { data }
}

export async function avancarFila(filaId: string, novoStatus: 'chamado' | 'passou' | 'ausente') {
  if (process.env.NEXT_PUBLIC_MOCK === 'true') return { success: true }
  const session = await getSession()
  requireRole(session, ['financeiro', 'organizador'])

  const supabase = await createClient()
  const updates: Record<string, any> = { status: novoStatus }

  if (novoStatus === 'chamado') updates.hora_chamada = new Date().toISOString()
  if (novoStatus === 'passou') updates.hora_entrada = new Date().toISOString()
  if (novoStatus === 'ausente') updates.hora_ausencia = new Date().toISOString()

  const { error } = await supabase
    .from('fila_entrada')
    .update(updates)
    .eq('id', filaId)

  if (error) return { error: error.message }
  revalidatePath('/eventos')
  return { success: true }
}
