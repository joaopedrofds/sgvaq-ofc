'use server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { requireRole } from '@/lib/auth/require-role'
import { revalidatePath } from 'next/cache'
import { modalidadeSchema } from '@/lib/modalidades/schema'
import { mockModalidades, mockCriterios } from '@/lib/mock/data'

export async function createModalidade(eventoId: string, formData: z.infer<typeof modalidadeSchema>) {
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    return { data: { id: 'mock-mod-' + Date.now(), evento_id: eventoId, ...formData, senhas_vendidas: 0, checkin_aberto: false } }
  }
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
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    const data = mockModalidades.filter(m => m.evento_id === eventoId)
    return { data }
  }
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
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    const data = mockCriterios.filter(c => c.tipo_prova === tipoProva)
    return { data }
  }
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
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    return { success: true }
  }
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
