'use server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { requireRole } from '@/lib/auth/require-role'
import { revalidatePath } from 'next/cache'
import type { EventoStatus } from '@/types'

export const eventoSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  tipo: z.enum(['vaquejada', 'tambor']),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  local: z.string().optional(),
  cidade: z.string().min(2, 'Cidade obrigatória'),
  estado: z.string().length(2, 'UF deve ter 2 caracteres'),
}).refine(d => d.data_fim >= d.data_inicio, {
  message: 'data_fim deve ser igual ou posterior a data_inicio',
  path: ['data_fim'],
})

const VALID_TRANSITIONS: Record<EventoStatus, EventoStatus[]> = {
  rascunho: ['aberto'],
  aberto: ['em_andamento'],
  em_andamento: ['encerrado'],
  encerrado: [],
}

export function validateEventoTransition(from: EventoStatus, to: EventoStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export async function createEvento(formData: z.infer<typeof eventoSchema>) {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const parsed = eventoSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { data: limitOk } = await admin.rpc('check_plan_limit', {
    p_tenant_id: session!.tenantId,
    p_resource: 'eventos_mes',
  })
  if (!limitOk) return { error: 'Limite de eventos do plano atingido (máx 10/mês no plano básico).' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('eventos')
    .insert({ ...parsed.data, tenant_id: session!.tenantId })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/eventos')
  return { data }
}

export async function updateEvento(id: string, formData: Partial<z.infer<typeof eventoSchema>>) {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('eventos')
    .update(formData)
    .eq('id', id)
    .eq('tenant_id', session!.tenantId)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/eventos/${id}`)
  return { data }
}

export async function transitionEventoStatus(id: string, novoStatus: EventoStatus) {
  const session = await getSession()
  requireRole(session, ['organizador', 'financeiro'])

  const supabase = await createClient()
  const { data: evento } = await supabase
    .from('eventos')
    .select('status')
    .eq('id', id)
    .single()

  if (!evento) return { error: 'Evento não encontrado' }
  if (!validateEventoTransition(evento.status as EventoStatus, novoStatus)) {
    return { error: `Transição inválida: ${evento.status} → ${novoStatus}` }
  }

  const { error } = await supabase
    .from('eventos')
    .update({ status: novoStatus })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/eventos/${id}`)
  return { success: true }
}

export async function getEventos() {
  const session = await getSession()
  requireRole(session, ['organizador', 'financeiro', 'juiz', 'locutor'])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('eventos')
    .select('*, modalidades(count)')
    .order('data_inicio', { ascending: false })

  if (error) return { error: error.message }
  return { data }
}
