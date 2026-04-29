'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { revalidatePath } from 'next/cache'
import { competidorSchema } from '@/lib/competidores/schema'
import { mockCompetidores, addMockCompetidor, MockCompetidor } from '@/lib/mock/data'

export async function createCompetidor(formData: FormData) {
  const raw = Object.fromEntries(formData)
  const parsed = competidorSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: parsed.error.issues.map(i => i.message).join(', ') }
  }

  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    const novo: MockCompetidor = {
      id: `mock-comp-${Date.now()}`,
      ...parsed.data,
      whatsapp: parsed.data.whatsapp || null,
      cidade: parsed.data.cidade || null,
      estado: parsed.data.estado || null,
      foto_url: null,
      lgpd_aceite_em: null,
      created_at: new Date().toISOString(),
    }
    addMockCompetidor(novo)
    revalidatePath('/competidores')
    return { success: true, data: novo }
  }

  const session = await getSession()
  if (!session) return { error: 'Não autenticado' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('competidores')
    .insert({
      tenant_id: session.tenantId,
      nome: parsed.data.nome,
      cpf: parsed.data.cpf,
      whatsapp: parsed.data.whatsapp || null,
      cidade: parsed.data.cidade || null,
      estado: parsed.data.estado || null,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/competidores')
  return { success: true, data }
}