import { describe, it, expect } from 'vitest'
import { buildPassadaPayload, validateOfflinePayload } from '@/lib/offline/queue'

describe('buildPassadaPayload', () => {
  it('gera payload com uuid_local e created_at_local', () => {
    const payload = buildPassadaPayload({
      senha_id: 'senha-1',
      modalidade_id: 'mod-1',
      numero_passada: 1,
      juiz_id: 'juiz-1',
      detalhes: [{ criterio_id: 'c1', nome: 'Derrubada', valor: 10, peso: 2, pontuacao: 20, observacao: '' }],
      penalidade: 0,
    })
    expect(payload.uuid_local).toBeDefined()
    expect(payload.uuid_local).toMatch(/^[0-9a-f-]{36}$/)
    expect(payload.created_at_local).toBeDefined()
    expect(payload.pontuacao_total).toBe(20)
  })

  it('calcula pontuacao_total corretamente', () => {
    const payload = buildPassadaPayload({
      senha_id: 'senha-1',
      modalidade_id: 'mod-1',
      numero_passada: 1,
      juiz_id: 'juiz-1',
      detalhes: [
        { criterio_id: 'c1', nome: 'Derrubada', valor: 8, peso: 2.0, pontuacao: 16, observacao: '' },
        { criterio_id: 'c2', nome: 'Faixa', valor: 7, peso: 1.5, pontuacao: 10.5, observacao: '' },
      ],
      penalidade: 2,
    })
    expect(payload.pontuacao_total).toBe(24.5) // 16 + 10.5 - 2
  })
})

describe('validateOfflinePayload', () => {
  it('aceita payload válido', () => {
    const payload = buildPassadaPayload({
      senha_id: 'uuid-1',
      modalidade_id: 'uuid-2',
      numero_passada: 1,
      juiz_id: 'uuid-3',
      detalhes: [],
      penalidade: 0,
    })
    expect(validateOfflinePayload(payload)).toBe(true)
  })
})
