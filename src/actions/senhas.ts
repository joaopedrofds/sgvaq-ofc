'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { requireRole } from '@/lib/auth/require-role'
import { revalidatePath } from 'next/cache'
import { vendaSchema } from '@/lib/senhas/schema'
import { mockSenhas, mockCompetidores, mockModalidades } from '@/lib/mock/data'

export async function venderSenhaPresencial(formData: z.infer<typeof vendaSchema>) {
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    const modalidade = mockModalidades.find(m => m.id === formData.modalidade_id)
    const competidor = mockCompetidores.find(c => c.cpf.replace(/\D/g, '') === formData.competidor_cpf.replace(/\D/g, ''))
    if (!competidor) return { error: 'Competidor não encontrado. Cadastre-o primeiro.' }
    if (!modalidade) return { error: 'Modalidade não encontrada' }
    if (modalidade.senhas_vendidas >= modalidade.total_senhas) return { error: 'Estoque de senhas esgotado' }
    const mockSenha = {
      id: 'mock-senha-' + Date.now(),
      modalidade_id: formData.modalidade_id,
      competidor_id: competidor.id,
      numero_senha: mockSenhas.filter(s => s.modalidade_id === formData.modalidade_id).length + 1,
      canal: 'presencial',
      status: 'ativa',
      valor_pago: modalidade.valor_senha,
      competidores: { nome: competidor.nome, cpf: competidor.cpf, whatsapp: competidor.whatsapp },
    }
    return { data: mockSenha }
  }
  const session = await getSession()
  requireRole(session, ['financeiro', 'organizador'])

  const parsed = vendaSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const admin = createAdminClient()

  // Buscar competidor pelo CPF
  const cpfClean = parsed.data.competidor_cpf.replace(/\D/g, '')
  const { data: competidor } = await supabase
    .from('competidores')
    .select('id')
    .eq('cpf', cpfClean)
    .single()

  if (!competidor) return { error: 'Competidor não encontrado. Cadastre-o primeiro.' }

  // Buscar valor da senha
  const { data: modalidade } = await supabase
    .from('modalidades')
    .select('valor_senha, total_senhas, senhas_vendidas')
    .eq('id', parsed.data.modalidade_id)
    .single()

  if (!modalidade) return { error: 'Modalidade não encontrada' }
  if (modalidade.senhas_vendidas >= modalidade.total_senhas) {
    return { error: 'Estoque de senhas esgotado para esta modalidade' }
  }

  // Próximo número de senha
  const { data: ultimaSenha } = await supabase
    .from('senhas')
    .select('numero_senha')
    .eq('modalidade_id', parsed.data.modalidade_id)
    .order('numero_senha', { ascending: false })
    .limit(1)
    .single()

  const proximoNumero = (ultimaSenha?.numero_senha ?? 0) + 1

  // Buscar tenant_user do financeiro
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('user_id', session!.id)
    .single()

  // Inserir senha
  const { data: senha, error: senhaError } = await supabase
    .from('senhas')
    .insert({
      modalidade_id: parsed.data.modalidade_id,
      competidor_id: competidor.id,
      numero_senha: proximoNumero,
      canal: 'presencial',
      status: 'ativa',
      valor_pago: modalidade.valor_senha,
      vendido_por: tenantUser?.id,
    })
    .select()
    .single()

  if (senhaError) return { error: senhaError.message }

  // Incrementar senhas_vendidas atomicamente
  await admin.rpc('increment_senhas_vendidas', { p_modalidade_id: parsed.data.modalidade_id })

  // Registrar no audit log
  await supabase.from('financeiro_transacoes').insert({
    tenant_id: session!.tenantId,
    senha_id: senha.id,
    tipo: 'venda',
    valor: modalidade.valor_senha,
    canal: 'presencial',
    user_id: session!.id,
  })

  revalidatePath('/eventos')
  return { data: senha }
}

export async function cancelarSenha(senhaId: string, motivo?: string) {
  if (process.env.NEXT_PUBLIC_MOCK === 'true') return { success: true }
  const session = await getSession()
  requireRole(session, ['financeiro', 'organizador'])

  const supabase = await createClient()
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('user_id', session!.id)
    .single()

  const { data: senha } = await supabase
    .from('senhas')
    .select('status, modalidade_id, valor_pago')
    .eq('id', senhaId)
    .single()

  if (!senha) return { error: 'Senha não encontrada' }
  if (senha.status === 'cancelada') return { error: 'Senha já está cancelada' }

  const { error } = await supabase
    .from('senhas')
    .update({
      status: 'cancelada',
      cancelado_por: tenantUser?.id,
      cancelado_em: new Date().toISOString(),
    })
    .eq('id', senhaId)

  if (error) return { error: error.message }

  const admin = createAdminClient()
  await admin.rpc('decrement_senhas_vendidas', { p_modalidade_id: senha.modalidade_id })

  await supabase.from('financeiro_transacoes').insert({
    tenant_id: session!.tenantId,
    senha_id: senhaId,
    tipo: 'cancelamento',
    valor: -senha.valor_pago,
    canal: 'presencial',
    user_id: session!.id,
  })

  return { success: true }
}

export async function getSenhasByModalidade(modalidadeId: string) {
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    const data = mockSenhas.filter(s => s.modalidade_id === modalidadeId)
    return { data }
  }
  const session = await getSession()
  requireRole(session, ['organizador', 'financeiro'])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('senhas')
    .select('*, competidores(nome, cpf, whatsapp)')
    .eq('modalidade_id', modalidadeId)
    .order('numero_senha')

  if (error) return { error: error.message }
  return { data }
}
