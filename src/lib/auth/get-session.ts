import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import type { SessionUser } from '@/types'
import { mockSession } from '@/lib/mock/data'

export async function getSession(): Promise<SessionUser | null> {
  if (process.env.NEXT_PUBLIC_MOCK === 'true') {
    const cookieStore = await cookies()
    const mockAuth = cookieStore.get('__sgvaq_mock_auth')
    if (!mockAuth) return null
    return mockSession
  }

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
