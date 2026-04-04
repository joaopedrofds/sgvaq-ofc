'use client'
import { useState, useRef } from 'react'
import { venderSenhaPresencial } from '@/actions/senhas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SenhaPrint } from './senha-print'

interface ModalidadeInfo {
  id: string
  nome: string
  valor_senha: number
}

interface CaixaFormProps {
  modalidades: ModalidadeInfo[]
  nomeEvento: string
  dataEvento: string
  tenantId: string
  nomeOrganizadora: string
}

export function CaixaForm({ modalidades, nomeEvento, dataEvento, tenantId, nomeOrganizadora }: CaixaFormProps) {
  const [cpf, setCpf] = useState('')
  const [modalidadeId, setModalidadeId] = useState(modalidades[0]?.id ?? '')
  const [senha, setSenha] = useState<any>(null)
  const [competidor, setCompetidor] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const selectedModalidade = modalidades.find(m => m.id === modalidadeId)

  async function handleVenda() {
    setLoading(true)
    setError(null)
    const result = await venderSenhaPresencial({
      modalidade_id: modalidadeId,
      competidor_cpf: cpf,
      canal: 'presencial',
    })
    if ('error' in result) { setError(result.error); setLoading(false); return }
    setSenha(result.data)
    setLoading(false)
  }

  function handlePrint() {
    window.print()
  }

  if (senha && competidor) {
    return (
      <div className="space-y-4">
        <div className="print-area" ref={printRef}>
          <SenhaPrint
            senhaId={senha.id}
            tenantId={tenantId}
            numeroSenha={senha.numero_senha}
            nomeCompetidor={competidor.nome}
            nomeEvento={nomeEvento}
            dataEvento={dataEvento}
            modalidade={selectedModalidade?.nome ?? ''}
            valorPago={senha.valor_pago}
            nomeOrganizadora={nomeOrganizadora}
          />
        </div>
        <div className="flex gap-2 print:hidden">
          <Button onClick={handlePrint} className="bg-amber-700 hover:bg-amber-800">
            Imprimir senha
          </Button>
          <Button variant="outline" onClick={() => { setSenha(null); setCpf('') }}>
            Nova venda
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-sm">
      <div className="space-y-1">
        <Label>CPF do competidor</Label>
        <Input
          value={cpf}
          onChange={e => setCpf(e.target.value)}
          placeholder="000.000.000-00"
        />
      </div>
      <div className="space-y-1">
        <Label>Modalidade</Label>
        <select
          value={modalidadeId}
          onChange={e => setModalidadeId(e.target.value)}
          className="w-full border rounded-md px-3 py-2 text-sm"
        >
          {modalidades.map(m => (
            <option key={m.id} value={m.id}>{m.nome}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={handleVenda} disabled={loading || !cpf} className="w-full bg-amber-700 hover:bg-amber-800">
        {loading ? 'Processando...' : 'Registrar venda'}
      </Button>
    </div>
  )
}
