'use server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { requireRole } from '@/lib/auth/require-role'
import { revalidatePath } from 'next/cache'

export const modalidadeSchema = z.object({
  nome: z.string().min(2),
  valor_senha: z.number().int().min(0),
  total_senhas: z.number().int().min(1, 'Deve ter ao menos 1 senha'),
  premiacao_descricao: z.string().optional(),
})

export async function createModalidade(eventoId: string, formData: z.infer<typeof modalidadeSchema>) {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const parsed = modalidadeSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('modalidades')
    .insert({ ...parsed.data, evento_id: eventoId })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/eventos/${eventoId}/modalidades`)
  return { data }
}

export async function getModalidades(eventoId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('modalidades')
    .select('*, modalidade_criterios(*, criterios_pontuacao(*))')
    .eq('evento_id', eventoId)
    .order('nome')

  if (error) return { error: error.message }
  return { data }
}

export async function getCriteriosPadrao(tipoProva: 'vaquejada' | 'tambor') {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('criterios_pontuacao')
    .select('*')
    .eq('tipo_prova', tipoProva)
    .order('ordem')

  if (error) return { error: error.message }
  return { data }
}

export async function updateModalidadeCriterios(
  modalidadeId: string,
  criterios: { criterio_id: string; peso_override?: number }[]
) {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const supabase = await createClient()
  await supabase.from('modalidade_criterios').delete().eq('modalidade_id', modalidadeId)

  if (criterios.length > 0) {
    const { error } = await supabase.from('modalidade_criterios').insert(
      criterios.map(c => ({ modalidade_id: modalidadeId, ...c }))
    )
    if (error) return { error: error.message }
  }

  return { success: true }
}
