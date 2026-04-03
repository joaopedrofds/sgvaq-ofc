import { describe, it, expect } from 'vitest'
import { modalidadeSchema } from '@/actions/modalidades'

describe('modalidadeSchema', () => {
  it('valida modalidade válida', () => {
    const r = modalidadeSchema.safeParse({
      nome: 'Aberto',
      valor_senha: 5000,
      total_senhas: 100,
      premiacao_descricao: '1º lugar: R$5.000',
    })
    expect(r.success).toBe(true)
  })

  it('aceita valor_senha = 0 (gratuito)', () => {
    const r = modalidadeSchema.safeParse({
      nome: 'Gratuito',
      valor_senha: 0,
      total_senhas: 50,
    })
    expect(r.success).toBe(true)
  })

  it('rejeita total_senhas = 0', () => {
    const r = modalidadeSchema.safeParse({
      nome: 'Teste',
      valor_senha: 1000,
      total_senhas: 0,
    })
    expect(r.success).toBe(false)
  })
})
