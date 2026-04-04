import { describe, it, expect } from 'vitest'
import { calcularResumoDeTransacoes } from '@/actions/financeiro'
import type { FinanceiroTransacao } from '@/actions/financeiro'

const mockTransacoes: FinanceiroTransacao[] = [
  { id: '1', tipo: 'venda',        valor: 5000,  taxa_sgvaq: 500,  descricao: null, created_at: '2026-04-01', senha_id: null, evento_id: 'ev1' },
  { id: '2', tipo: 'venda',        valor: 10000, taxa_sgvaq: 1000, descricao: null, created_at: '2026-04-01', senha_id: null, evento_id: 'ev1' },
  { id: '3', tipo: 'cancelamento', valor: -5000, taxa_sgvaq: -500, descricao: null, created_at: '2026-04-01', senha_id: null, evento_id: 'ev1' },
]

describe('calcularResumoDeTransacoes', () => {
  it('calculates net total correctly including cancellations', () => {
    const result = calcularResumoDeTransacoes(mockTransacoes)
    // 5000 + 10000 - 5000 = 10000
    expect(result.totalBruto).toBe(10000)
    // 500 + 1000 - 500 = 1000
    expect(result.totalTaxaSgvaq).toBe(1000)
    expect(result.quantidadeVendas).toBe(2)
    expect(result.quantidadeCancelamentos).toBe(1)
  })

  it('returns zeroes for empty list', () => {
    const result = calcularResumoDeTransacoes([])
    expect(result.totalBruto).toBe(0)
    expect(result.totalTaxaSgvaq).toBe(0)
    expect(result.quantidadeVendas).toBe(0)
    expect(result.quantidadeCancelamentos).toBe(0)
  })
})
