import { describe, it, expect } from 'vitest'
import { centavosToReais, reaisToCentavos, formatMoney, calcularTaxaSGVAQ } from '@/lib/utils/money'

describe('centavosToReais', () => {
  it('converte 5000 centavos em 50.00', () => {
    expect(centavosToReais(5000)).toBe(50.00)
  })
  it('converte 0 em 0', () => {
    expect(centavosToReais(0)).toBe(0)
  })
})

describe('reaisToCentavos', () => {
  it('converte 50.00 em 5000', () => {
    expect(reaisToCentavos(50.00)).toBe(5000)
  })
  it('arredonda para baixo: 1.999 → 199', () => {
    expect(reaisToCentavos(1.999)).toBe(199)
  })
})

describe('formatMoney', () => {
  it('formata 5000 como R$ 50,00', () => {
    expect(formatMoney(5000)).toBe('R$ 50,00')
  })
  it('formata 0 como R$ 0,00', () => {
    expect(formatMoney(0)).toBe('R$ 0,00')
  })
})

describe('calcularTaxaSGVAQ', () => {
  it('calcula 10% de 5000 = 500', () => {
    expect(calcularTaxaSGVAQ(5000)).toBe(500)
  })
  it('arredonda para baixo: 1500 → 150', () => {
    expect(calcularTaxaSGVAQ(1500)).toBe(150)
  })
  it('retorna 0 para valor 0', () => {
    expect(calcularTaxaSGVAQ(0)).toBe(0)
  })
  it('arredonda para baixo: 15 centavos → taxa = 1', () => {
    expect(calcularTaxaSGVAQ(15)).toBe(1)
  })
})
