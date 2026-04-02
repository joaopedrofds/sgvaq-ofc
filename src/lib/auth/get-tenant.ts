import { createAdminClient } from '@/lib/supabase/admin'
import type { TenantContext } from '@/types'

const tenantCache = new Map<string, { tenantId: string; expiresAt: number }>()

export async function getTenantBySlug(slug: string): Promise<TenantContext | null> {
  const cached = tenantCache.get(slug)
  if (cached && cached.expiresAt > Date.now()) {
    return { tenantId: cached.tenantId, slug }
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .eq('ativo', true)
    .single()

  if (!data) return null

  tenantCache.set(slug, { tenantId: data.id, expiresAt: Date.now() + 60_000 })
  return { tenantId: data.id, slug }
}
