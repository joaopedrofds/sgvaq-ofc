import { describe, it, expect } from 'vitest'
import { eventoSchema, validateEventoTransition } from '@/actions/eventos'

describe('eventoSchema', () => {
  it('valida evento válido', () => {
    const result = eventoSchema.safeParse({
      nome: 'Vaquejada do Nordeste',
      tipo: 'vaquejada',
      data_inicio: '2026-05-01',
      data_fim: '2026-05-02',
      local: 'Parque de Vaquejada',
      cidade: 'Fortaleza',
      estado: 'CE',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita data_fim anterior a data_inicio', () => {
    const result = eventoSchema.safeParse({
      nome: 'Teste',
      tipo: 'vaquejada',
      data_inicio: '2026-05-02',
      data_fim: '2026-05-01',
      cidade: 'Fortaleza',
      estado: 'CE',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toContain('data_fim')
  })
})

describe('validateEventoTransition', () => {
  it('permite rascunho → aberto', () => {
    expect(validateEventoTransition('rascunho', 'aberto')).toBe(true)
  })
  it('permite aberto → em_andamento', () => {
    expect(validateEventoTransition('aberto', 'em_andamento')).toBe(true)
  })
  it('permite em_andamento → encerrado', () => {
    expect(validateEventoTransition('em_andamento', 'encerrado')).toBe(true)
  })
  it('nega encerrado → qualquer coisa', () => {
    expect(validateEventoTransition('encerrado', 'aberto')).toBe(false)
    expect(validateEventoTransition('encerrado', 'rascunho')).toBe(false)
  })
  it('nega pular etapas (rascunho → em_andamento)', () => {
    expect(validateEventoTransition('rascunho', 'em_andamento')).toBe(false)
  })
})
