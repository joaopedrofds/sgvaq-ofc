import { describe, it, expect } from 'vitest'
import { extractSlugFromHost, isPublicRoute, isAdminRoute } from '@/lib/utils/routing'

describe('extractSlugFromHost', () => {
  it('extrai slug de subdomínio em produção', () => {
    expect(extractSlugFromHost('minha-vaquejada.sgvaq.com.br', 'sgvaq.com.br')).toBe('minha-vaquejada')
  })
  it('extrai slug em desenvolvimento (slug.localhost)', () => {
    expect(extractSlugFromHost('minha-vaquejada.localhost', 'localhost')).toBe('minha-vaquejada')
  })
  it('retorna null para domínio raiz (sem subdomínio)', () => {
    expect(extractSlugFromHost('sgvaq.com.br', 'sgvaq.com.br')).toBeNull()
    expect(extractSlugFromHost('localhost', 'localhost')).toBeNull()
  })
  it('retorna null para subdomínio www', () => {
    expect(extractSlugFromHost('www.sgvaq.com.br', 'sgvaq.com.br')).toBeNull()
  })
})

describe('isPublicRoute', () => {
  it('marca /evento/* como público', () => {
    expect(isPublicRoute('/evento/123')).toBe(true)
    expect(isPublicRoute('/evento/123/inscricao')).toBe(true)
  })
  it('marca /locutor/* como público', () => {
    expect(isPublicRoute('/locutor/123')).toBe(true)
  })
  it('marca /login e /cadastro como público', () => {
    expect(isPublicRoute('/login')).toBe(true)
    expect(isPublicRoute('/cadastro')).toBe(true)
  })
  it('não marca /dashboard como público', () => {
    expect(isPublicRoute('/dashboard')).toBe(false)
  })
})
