'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { uploadComprovante } from '@/actions/comprovantes'

export default function InscricaoPage() {
  const searchParams = useSearchParams()
  const modalidadeId = searchParams.get('modalidade') ?? ''
  const [cpf, setCpf] = useState('')
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [senhaId, setSenhaId] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'upload' | 'done'>('form')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmitDados(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    // Criar senha pendente online (sem incrementar estoque — só após aprovação)
    const res = await fetch('/api/senhas/online', {
      method: 'POST',
      body: JSON.stringify({ cpf, nome, whatsapp, modalidade_id: modalidadeId }),
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false); return }
    setSenhaId(data.senha_id)
    setStep('upload')
    setLoading(false)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !senhaId) return
    setLoading(true)
    setError(null)
    const result = await uploadComprovante(senhaId, file)
    if ('error' in result) { setError(result.error); setLoading(false); return }
    setStep('done')
    setLoading(false)
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-green-700">Comprovante enviado!</h2>
          <p className="text-gray-600">
            Seu comprovante está em análise. Você receberá uma confirmação pelo WhatsApp
            quando sua senha for ativada.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl p-8 max-w-md w-full space-y-6">
        <h1 className="text-2xl font-bold text-amber-900">Compra de Senha</h1>

        {step === 'form' && (
          <form onSubmit={handleSubmitDados} className="space-y-4">
            <div className="space-y-1">
              <Label>Nome completo</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" required />
            </div>
            <div className="space-y-1">
              <Label>WhatsApp</Label>
              <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(85) 99999-9999" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full bg-amber-700 hover:bg-amber-800">
              {loading ? 'Processando...' : 'Continuar'}
            </Button>
          </form>
        )}

        {step === 'upload' && (
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">Dados para Pix:</p>
              <p>Chave: <strong>11999999999</strong></p>
              <p>Favorecido: <strong>Organizadora do Evento</strong></p>
            </div>
            <div className="space-y-1">
              <Label>Comprovante do Pix</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                required
              />
              <p className="text-xs text-gray-500">JPG, PNG ou PDF — máx 5MB</p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading || !file} className="w-full bg-amber-700 hover:bg-amber-800">
              {loading ? 'Enviando...' : 'Enviar comprovante'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
