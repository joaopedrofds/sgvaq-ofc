'use server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { requireRole } from '@/lib/auth/require-role'
import { revalidatePath } from 'next/cache'

const conviteSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['financeiro', 'juiz', 'locutor']),
  whatsapp: z.string().optional(),
})

export async function convidarMembro(formData: z.infer<typeof conviteSchema>) {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const parsed = conviteSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { data: limitOk } = await admin.rpc('check_plan_limit', {
    p_tenant_id: session!.tenantId,
    p_resource: 'usuarios',
  })
  if (!limitOk) return { error: 'Limite de usuários atingido (máx 5 no plano básico).' }

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: {
        role: parsed.data.role,
        tenant_id: session!.tenantId,
        nome: parsed.data.nome,
      },
    }
  )
  if (inviteError) return { error: inviteError.message }

  const supabase = await createClient()
  const { error } = await supabase.from('tenant_users').insert({
    tenant_id: session!.tenantId,
    user_id: inviteData.user.id,
    nome: parsed.data.nome,
    email: parsed.data.email,
    role: parsed.data.role,
    whatsapp: parsed.data.whatsapp,
  })

  if (error) return { error: error.message }
  revalidatePath('/equipe')
  return { success: true }
}

export async function getEquipe() {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_users')
    .select('*')
    .order('nome')

  if (error) return { error: error.message }
  return { data }
}

export async function desativarMembro(userId: string) {
  const session = await getSession()
  requireRole(session, ['organizador'])

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenant_users')
    .update({ ativo: false })
    .eq('user_id', userId)

  if (error) return { error: error.message }
  revalidatePath('/equipe')
  return { success: true }
}
