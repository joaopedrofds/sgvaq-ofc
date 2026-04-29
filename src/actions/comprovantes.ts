'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { requireRole } from '@/lib/auth/require-role'
import { revalidatePath } from 'next/cache'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function uploadComprovante(senhaId: string, file: File) {
  if (process.env.NEXT_PUBLIC_MOCK === 'true') return { success: true }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Tipo de arquivo não permitido. Use JPG, PNG ou PDF.' }
  }
  if (file.size > MAX_SIZE) {
    return { error: 'Arquivo muito grande. Máximo 5MB.' }
  }

  const supabase = await createClient()
  const ext = file.name.split('.').pop()
  const path = `${senhaId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('comprovantes')
    .upload(path, file, { contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { error } = await supabase
    .from('senhas')
    .update({
      comprovante_url: path,
      comprovante_status: 'pendente',
    })
    .eq('id', senhaId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getComprovanteUrl(senhaId: string) {
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    return { url: '/mock/comprovante.pdf' }
  }
  const supabase = await createClient()
  const { data: senha } = await supabase
    .from('senhas')
    .select('comprovante_url')
    .eq('id', senhaId)
    .single()

  if (!senha?.comprovante_url) return { error: 'Sem comprovante' }

  // Gera signed URL sob demanda (não armazena)
  const { data } = await supabase.storage
    .from('comprovantes')
    .createSignedUrl(senha.comprovante_url, 3600)

  return { url: data?.signedUrl }
}

export async function aprovarComprovante(senhaId: string) {
  if (process.env.NEXT_PUBLIC_MOCK === 'true') return { success: true }
  const session = await getSession()
  requireRole(session, ['financeiro', 'organizador'])

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: senha } = await supabase
    .from('senhas')
    .select('modalidade_id, valor_pago, competidor_id, comprovante_status')
    .eq('id', senhaId)
    .single()

  if (!senha) return { error: 'Senha não encontrada' }
  if (senha.comprovante_status !== 'pendente') return { error: 'Comprovante não está pendente' }

  // Verificar estoque antes de ativar
  const { data: modalidade } = await supabase
    .from('modalidades')
    .select('total_senhas, senhas_vendidas')
    .eq('id', senha.modalidade_id)
    .single()

  if (!modalidade || modalidade.senhas_vendidas >= modalidade.total_senhas) {
    return { error: 'Estoque esgotado. Não é possível aprovar.' }
  }

  const { error } = await supabase
    .from('senhas')
    .update({ status: 'ativa', comprovante_status: 'aprovado' })
    .eq('id', senhaId)

  if (error) return { error: error.message }

  await admin.rpc('increment_senhas_vendidas', { p_modalidade_id: senha.modalidade_id })

  await supabase.from('financeiro_transacoes').insert({
    tenant_id: session!.tenantId,
    senha_id: senhaId,
    tipo: 'venda',
    valor: senha.valor_pago,
    canal: 'online',
    user_id: session!.id,
  })

  // Enfileirar notificação WhatsApp
  await supabase.from('notificacoes_fila').insert({
    idempotency_key: `comprovante_aprovado:${senhaId}`,
    competidor_id: senha.competidor_id,
    tipo: 'comprovante_aprovado',
    mensagem: 'Seu comprovante foi aprovado! Sua senha está ativa.',
  }).onConflict('idempotency_key').ignore()

  revalidatePath('/financeiro')
  return { success: true }
}

export async function rejeitarComprovante(senhaId: string, motivo: string) {
  if (process.env.NEXT_PUBLIC_MOCK === 'true') return { success: true }
  const session = await getSession()
  requireRole(session, ['financeiro', 'organizador'])

  if (!motivo.trim()) return { error: 'Motivo de rejeição é obrigatório' }

  const supabase = await createClient()
  const { data: senha } = await supabase
    .from('senhas')
    .select('competidor_id')
    .eq('id', senhaId)
    .single()

  const { error } = await supabase
    .from('senhas')
    .update({
      comprovante_status: 'rejeitado',
      comprovante_rejeicao_motivo: motivo,
    })
    .eq('id', senhaId)

  if (error) return { error: error.message }

  // Notificar competidor
  if (senha) {
    await supabase.from('notificacoes_fila').insert({
      idempotency_key: `comprovante_rejeitado:${senhaId}`,
      competidor_id: senha.competidor_id,
      tipo: 'comprovante_rejeitado',
      mensagem: `Seu comprovante foi rejeitado. Motivo: ${motivo}`,
    }).onConflict('idempotency_key').ignore()
  }

  revalidatePath('/financeiro')
  return { success: true }
}
