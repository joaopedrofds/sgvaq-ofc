'use server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { requireRole } from '@/lib/auth/require-role'
import { revalidatePath } from 'next/cache'
import type { EventoStatus } from '@/types'
import { eventoSchema, validateEventoTransition } from '@/lib/eventos/schema'
import { mockEventos, addMockEvento } from '@/lib/mock/data'

export async function createEvento(formData: z.infer<typeof eventoSchema>) {
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    const novoEvento = { id: 'mock-evento-' + Date.now(), ...formData, status: 'rascunho' as const, tenant_id: 'mock-tenant-1', banner_url: null, regulamento_url: null, created_at: new Date().toISOString(), modalidades: [{ count: 0 }] }
    addMockEvento(novoEvento)
    return { data: novoEvento }
  }
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
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    const idx = mockEventos.findIndex(e => e.id === id)
    if (idx >= 0) Object.assign(mockEventos[idx], formData)
    return { data: { ...formData, id } }
  }
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
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    const evento = mockEventos.find(e => e.id === id)
    if (!evento) return { error: 'Evento não encontrado' }
    if (!validateEventoTransition(evento.status as EventoStatus, novoStatus)) {
      return { error: `Transição inválida: ${evento.status} → ${novoStatus}` }
    }
    evento.status = novoStatus
    return { success: true }
  }
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
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    return { data: mockEventos }
  }
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
