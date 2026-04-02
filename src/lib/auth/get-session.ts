import { createClient } from '@/lib/supabase/server'
import type { SessionUser } from '@/types'

export async function getSession(): Promise<SessionUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const role = user.app_metadata?.role ?? user.user_metadata?.role
  const tenantId = user.app_metadata?.tenant_id ?? user.user_metadata?.tenant_id

  return {
    id: user.id,
    email: user.email ?? '',
    role,
    tenantId,
  }
}
