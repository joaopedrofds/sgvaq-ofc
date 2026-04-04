// ESC/POS command bytes
const ESC = 0x1b
const GS  = 0x1d
const LF  = 0x0a

// Commands
const RESET             = Buffer.from([ESC, 0x40])
const BOLD_ON           = Buffer.from([ESC, 0x45, 0x01])
const BOLD_OFF          = Buffer.from([ESC, 0x45, 0x00])
const ALIGN_CENTER      = Buffer.from([ESC, 0x61, 0x01])
const ALIGN_LEFT        = Buffer.from([ESC, 0x61, 0x00])
const DOUBLE_HEIGHT_ON  = Buffer.from([ESC, 0x21, 0x10])
const DOUBLE_HEIGHT_OFF = Buffer.from([ESC, 0x21, 0x00])
const CUT               = Buffer.from([GS, 0x56, 0x42, 0x00])
const NEWLINE           = Buffer.from([LF])

function text(str: string): Buffer {
  return Buffer.from(str + '\n', 'latin1')
}

function separator(): Buffer {
  return text('--------------------------------')
}

function formatBRL(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavos / 100)
}

export interface SenhaPayload {
  eventoNome: string
  modalidadeNome: string
  numeroSenha: string
  competidorNome: string
  valorSenha: number
  qrCodeData: string
  dataHora: string
}

export function buildSenhaEscPos(payload: SenhaPayload): Buffer {
  const parts: Buffer[] = []

  parts.push(RESET)
  parts.push(ALIGN_CENTER)
  parts.push(DOUBLE_HEIGHT_ON)
  parts.push(BOLD_ON)
  parts.push(text('SGVAQ'))
  parts.push(BOLD_OFF)
  parts.push(DOUBLE_HEIGHT_OFF)
  parts.push(text(payload.eventoNome))
  parts.push(text(payload.modalidadeNome))
  parts.push(separator())

  parts.push(ALIGN_LEFT)
  parts.push(text(`Senha: ${payload.numeroSenha}`))
  parts.push(text(`Competidor: ${payload.competidorNome}`))
  parts.push(text(`Valor: ${formatBRL(payload.valorSenha)}`))
  parts.push(text(`Data: ${new Date(payload.dataHora).toLocaleString('pt-BR')}`))
  parts.push(separator())

  // QR Code: GS ( k — store + print
  const qrData = Buffer.from(payload.qrCodeData, 'utf8')
  const qrStoreLen = qrData.length + 3
  parts.push(Buffer.from([
    GS, 0x28, 0x6b,           // GS ( k
    qrStoreLen & 0xff,         // pL
    (qrStoreLen >> 8) & 0xff,  // pH
    0x31, 0x50, 0x30,          // cn, fn, m (store QR data)
    ...qrData
  ]))
  // Print QR
  parts.push(Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]))
  parts.push(NEWLINE)
  parts.push(NEWLINE)
  parts.push(CUT)

  return Buffer.concat(parts)
}
