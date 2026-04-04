'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { gerarPdfRelatorioCaixa, gerarPdfFolhaPremiacao } from '@/actions/financeiro'
import { FileDown, Loader2 } from 'lucide-react'

function downloadBase64Pdf(base64: string, filename: string) {
  const link = document.createElement('a')
  link.href = `data:application/pdf;base64,${base64}`
  link.download = filename
  link.click()
}

export default function RelatorioPage({
  searchParams,
}: {
  searchParams: { evento_id?: string; modalidade_id?: string }
}) {
  const [loadingCaixa, setLoadingCaixa] = useState(false)
  const [loadingPremiacao, setLoadingPremiacao] = useState(false)

  const eventoId = searchParams.evento_id

  async function handleDownloadCaixa() {
    if (!eventoId) return
    setLoadingCaixa(true)
    try {
      const { base64, filename } = await gerarPdfRelatorioCaixa(eventoId)
      downloadBase64Pdf(base64, filename)
    } finally {
      setLoadingCaixa(false)
    }
  }

  async function handleDownloadPremiacao() {
    const modalidadeId = searchParams.modalidade_id
    if (!eventoId || !modalidadeId) return
    setLoadingPremiacao(true)
    try {
      const { base64, filename } = await gerarPdfFolhaPremiacao(eventoId, modalidadeId)
      downloadBase64Pdf(base64, filename)
    } finally {
      setLoadingPremiacao(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>
      <div className="flex flex-wrap gap-4">
        <Button onClick={handleDownloadCaixa} disabled={!eventoId || loadingCaixa}>
          {loadingCaixa ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
          Relatório de Caixa (PDF)
        </Button>
        <Button
          variant="outline"
          onClick={handleDownloadPremiacao}
          disabled={!eventoId || !searchParams.modalidade_id || loadingPremiacao}
        >
          {loadingPremiacao ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
          Folha de Premiação (PDF)
        </Button>
      </div>
    </div>
  )
}
