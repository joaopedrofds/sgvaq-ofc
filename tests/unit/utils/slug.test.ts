import { describe, it, expect } from 'vitest'
import { validateSlug, isReservedSlug, normalizeSlug } from '@/lib/utils/slug'

describe('validateSlug', () => {
  it('aceita slug válido', () => {
    expect(validateSlug('minha-vaquejada')).toBe(true)
    expect(validateSlug('vaq123')).toBe(true)
  })
  it('rejeita menos de 3 caracteres', () => {
    expect(validateSlug('ab')).toBe(false)
  })
  it('rejeita mais de 30 caracteres', () => {
    expect(validateSlug('a'.repeat(31))).toBe(false)
  })
  it('rejeita letras maiúsculas', () => {
    expect(validateSlug('MinhaVaquejada')).toBe(false)
  })
  it('rejeita caracteres especiais além de hífen', () => {
    expect(validateSlug('minha_vaquejada')).toBe(false)
    expect(validateSlug('minha.vaquejada')).toBe(false)
  })
})

describe('isReservedSlug', () => {
  it('rejeita slugs reservados', () => {
    const reserved = ['www', 'api', 'admin', 'app', 'static', 'mail', 'support', 'help', 'login', 'cadastro']
    reserved.forEach(s => expect(isReservedSlug(s)).toBe(true))
  })
  it('aceita slugs não reservados', () => {
    expect(isReservedSlug('minha-vaquejada')).toBe(false)
  })
})

describe('normalizeSlug', () => {
  it('converte para minúsculas', () => {
    expect(normalizeSlug('MinhaVaquejada')).toBe('minhavaquejada')
  })
  it('remove acentos e substitui espaços por hífens', () => {
    expect(normalizeSlug('Vaquejada do Norte')).toBe('vaquejada-do-norte')
  })
})
