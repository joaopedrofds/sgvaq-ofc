import { describe, it, expect } from 'vitest'
import { hasRole, canAccessTenant } from '@/lib/auth/require-role'
import type { SessionUser } from '@/types'

const makeUser = (role: string, tenantId?: string): SessionUser => ({
  id: 'user-1',
  email: 'test@test.com',
  role: role as any,
  tenantId,
})

describe('hasRole', () => {
  it('retorna true quando role bate', () => {
    expect(hasRole(makeUser('organizador'), ['organizador'])).toBe(true)
  })
  it('retorna true para super_admin com qualquer role listada', () => {
    expect(hasRole(makeUser('super_admin'), ['organizador', 'financeiro'])).toBe(true)
  })
  it('retorna false quando role não bate', () => {
    expect(hasRole(makeUser('juiz'), ['organizador'])).toBe(false)
  })
  it('retorna false para usuário null', () => {
    expect(hasRole(null, ['organizador'])).toBe(false)
  })
})

describe('canAccessTenant', () => {
  it('permite acesso quando tenant bate', () => {
    expect(canAccessTenant(makeUser('organizador', 'tenant-1'), 'tenant-1')).toBe(true)
  })
  it('nega acesso quando tenant não bate', () => {
    expect(canAccessTenant(makeUser('organizador', 'tenant-1'), 'tenant-2')).toBe(false)
  })
  it('super_admin acessa qualquer tenant', () => {
    expect(canAccessTenant(makeUser('super_admin', undefined), 'qualquer-tenant')).toBe(true)
  })
})
