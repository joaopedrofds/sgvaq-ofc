export interface ResumoFinanceiro {
  totalBruto: number        // centavos
  totalTaxaSgvaq: number    // centavos
  quantidadeVendas: number
  quantidadeCancelamentos: number
  transacoes: FinanceiroTransacao[]
}

export interface FinanceiroTransacao {
  id: string
  tipo: 'venda' | 'cancelamento'
  valor: number
  taxa_sgvaq: number
  descricao: string | null
  created_at: string
  senha_id: string | null
  evento_id: string
}

export function calcularResumoDeTransacoes(transacoes: FinanceiroTransacao[]): Omit<ResumoFinanceiro, 'transacoes'> {
  const totalBruto = transacoes.reduce((acc, t) => acc + t.valor, 0)
  const totalTaxaSgvaq = transacoes.reduce((acc, t) => acc + (t.taxa_sgvaq ?? 0), 0)
  const quantidadeVendas = transacoes.filter(t => t.tipo === 'venda').length
  const quantidadeCancelamentos = transacoes.filter(t => t.tipo === 'cancelamento').length
  return { totalBruto, totalTaxaSgvaq, quantidadeVendas, quantidadeCancelamentos }
}