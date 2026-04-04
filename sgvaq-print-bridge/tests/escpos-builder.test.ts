import { describe, it, expect } from 'vitest'
import { buildSenhaEscPos } from '../src/escpos-builder'

describe('buildSenhaEscPos', () => {
  it('returns a Buffer', () => {
    const payload = {
      eventoNome: 'Vaquejada Teste',
      modalidadeNome: 'Vaquejada Tradicional',
      numeroSenha: '0042',
      competidorNome: 'João da Silva',
      valorSenha: 5000, // centavos
      qrCodeData: 'sgvaq:senha:abc123',
      dataHora: '2026-04-01T10:00:00Z'
    }
    const buffer = buildSenhaEscPos(payload)
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(10)
  })

  it('includes ESC @ reset byte at start', () => {
    const payload = {
      eventoNome: 'Test',
      modalidadeNome: 'Test',
      numeroSenha: '001',
      competidorNome: 'Test',
      valorSenha: 0,
      qrCodeData: 'test',
      dataHora: '2026-01-01T00:00:00Z'
    }
    const buffer = buildSenhaEscPos(payload)
    // ESC @ = 0x1B 0x40
    expect(buffer[0]).toBe(0x1b)
    expect(buffer[1]).toBe(0x40)
  })
})
