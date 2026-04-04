'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { atualizarStatusCobranca, gerarPdfCobranca } from '@/actions/cobrancas'
import { FileDown, CheckCircle, XCircle, Loader2 } from 'lucide-react'

function downloadBase64Pdf(base64: string, filename: string) {
  const link = document.createElement('a')
  link.href = `data:application/pdf;base64,${base64}`
  link.download = filename
  link.click()
}

export default function CobrancaDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleDownloadPdf() {
    setLoading('pdf')
    try {
      const { base64, filename } = await gerarPdfCobranca(params.id)
      downloadBase64Pdf(base64, filename)
    } finally {
      setLoading(null)
    }
  }

  async function handleMarcarPago() {
    setLoading('pago')
    try {
      await atualizarStatusCobranca(params.id, 'pago')
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function handleMarcarIsento() {
    setLoading('isento')
    try {
      await atualizarStatusCobranca(params.id, 'isento')
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Detalhes da Cobrança</h1>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button onClick={handleDownloadPdf} variant="outline" disabled={loading === 'pdf'}>
              {loading === 'pdf' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
              Baixar PDF
            </Button>
            <Button onClick={handleMarcarPago} disabled={!!loading}>
              {loading === 'pago' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Marcar como Pago
            </Button>
            <Button onClick={handleMarcarIsento} variant="secondary" disabled={!!loading}>
              {loading === 'isento' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              Marcar como Isento
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
