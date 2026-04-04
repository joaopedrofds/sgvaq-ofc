import { QRCodeDisplay } from '@/components/qr/qr-code'
import { formatMoney } from '@/lib/utils/money'

interface SenhaPrintProps {
  senhaId: string
  tenantId: string
  numeroSenha: number
  nomeCompetidor: string
  nomeEvento: string
  dataEvento: string
  modalidade: string
  valorPago: number
  nomeOrganizadora: string
  logoUrl?: string
}

export function SenhaPrint({
  senhaId, tenantId, numeroSenha, nomeCompetidor,
  nomeEvento, dataEvento, modalidade, valorPago,
  nomeOrganizadora, logoUrl,
}: SenhaPrintProps) {
  const qrValue = JSON.stringify({ senha_id: senhaId, tenant_id: tenantId })

  return (
    <div className="w-80 border-2 border-black p-4 font-mono text-sm print:shadow-none">
      <div className="text-center border-b pb-2 mb-2">
        {logoUrl && <img src={logoUrl} alt={nomeOrganizadora} className="h-12 mx-auto mb-1" />}
        <p className="font-bold text-lg">{nomeOrganizadora}</p>
        <p className="font-bold">{nomeEvento}</p>
        <p className="text-xs">{new Date(dataEvento).toLocaleDateString('pt-BR')}</p>
      </div>

      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="font-bold text-2xl">#{numeroSenha.toString().padStart(3, '0')}</p>
          <p className="font-semibold">{nomeCompetidor}</p>
          <p className="text-xs text-gray-600">{modalidade}</p>
          <p className="text-xs text-gray-600">Valor: {formatMoney(valorPago)}</p>
        </div>
        <QRCodeDisplay value={qrValue} size={100} />
      </div>

      <div className="border-t mt-2 pt-2 text-center">
        <p className="text-xs text-gray-500">Apresente o QR Code no check-in</p>
      </div>
    </div>
  )
}
