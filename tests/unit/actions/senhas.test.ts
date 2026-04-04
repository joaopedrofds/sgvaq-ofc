import { describe, it, expect } from 'vitest'
import { vendaSchema } from '@/actions/senhas'

describe('vendaSchema', () => {
  it('valida venda presencial válida', () => {
    const r = vendaSchema.safeParse({
      modalidade_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      competidor_cpf: '123.456.789-09',
      canal: 'presencial',
    })
    expect(r.success).toBe(true)
  })

  it('valida venda online válida', () => {
    const r = vendaSchema.safeParse({
      modalidade_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      competidor_cpf: '123.456.789-09',
      canal: 'online',
    })
    expect(r.success).toBe(true)
  })

  it('rejeita canal inválido', () => {
    const r = vendaSchema.safeParse({
      modalidade_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      competidor_cpf: '123.456.789-09',
      canal: 'credito',
    })
    expect(r.success).toBe(false)
  })

  it('rejeita modalidade_id inválido (não UUID)', () => {
    const r = vendaSchema.safeParse({
      modalidade_id: 'nao-e-uuid',
      competidor_cpf: '123.456.789-09',
      canal: 'presencial',
    })
    expect(r.success).toBe(false)
  })

  it('rejeita CPF muito curto', () => {
    const r = vendaSchema.safeParse({
      modalidade_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      competidor_cpf: '123',
      canal: 'presencial',
    })
    expect(r.success).toBe(false)
  })
})
