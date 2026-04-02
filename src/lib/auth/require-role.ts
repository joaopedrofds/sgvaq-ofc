import { redirect } from 'next/navigation'
import type { SessionUser, UserRole } from '@/types'

export function hasRole(user: SessionUser | null, roles: UserRole[]): boolean {
  if (!user) return false
  if (user.role === 'super_admin') return true
  return roles.includes(user.role)
}

export function canAccessTenant(user: SessionUser | null, tenantId: string): boolean {
  if (!user) return false
  if (user.role === 'super_admin') return true
  return user.tenantId === tenantId
}

/** Use em Server Actions para garantir que o usuário tem a role correta. */
export function requireRole(user: SessionUser | null, roles: UserRole[]): asserts user is SessionUser {
  if (!user) redirect('/login')
  if (!hasRole(user, roles)) redirect('/login')
}
