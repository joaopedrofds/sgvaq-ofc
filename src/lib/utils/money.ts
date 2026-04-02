export function centavosToReais(centavos: number): number {
  return centavos / 100
}

export function reaisToCentavos(reais: number): number {
  return Math.floor(reais * 100)
}

export function formatMoney(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100).replace(/\u00A0/g, ' ')
}

/** Calcula a taxa de 10% do SGVAQ, arredondada para baixo em centavos */
export function calcularTaxaSGVAQ(valorEmCentavos: number): number {
  return Math.floor(valorEmCentavos * 0.1)
}
