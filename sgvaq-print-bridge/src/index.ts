import express from 'express'
import cors from 'cors'
import { buildSenhaEscPos, type SenhaPayload } from './escpos-builder'
import { printBuffer, type PrinterConfig } from './printer'

const PORT = Number(process.env.SGVAQ_BRIDGE_PORT ?? 6789)
const BEARER_TOKEN = process.env.SGVAQ_BRIDGE_TOKEN ?? 'sgvaq-local-dev-token'

const PRINTER_CONFIG: PrinterConfig = {
  type: (process.env.PRINTER_TYPE as PrinterConfig['type']) ?? 'usb',
  device: process.env.PRINTER_DEVICE ?? '/dev/usb/lp0',
  host: process.env.PRINTER_HOST,
  port: Number(process.env.PRINTER_PORT ?? 9100)
}

const app = express()

// Only allow connections from localhost
app.use((req, res, next) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? ''
  if (!ip.includes('127.0.0.1') && !ip.includes('::1')) {
    res.status(403).json({ error: 'Forbidden: localhost only' })
    return
  }
  next()
})

app.use(cors({ origin: /\.sgvaq\.com\.br$|localhost/ }))
app.use(express.json({ limit: '64kb' }))

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || authHeader !== `Bearer ${BEARER_TOKEN}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' })
})

app.post('/print', authMiddleware, async (req, res) => {
  try {
    const payload = req.body as SenhaPayload

    // Validate required fields
    const required: (keyof SenhaPayload)[] = [
      'eventoNome', 'modalidadeNome', 'numeroSenha',
      'competidorNome', 'valorSenha', 'qrCodeData', 'dataHora'
    ]
    for (const field of required) {
      if (payload[field] === undefined || payload[field] === null) {
        res.status(400).json({ error: `Missing field: ${field}` })
        return
      }
    }

    const buffer = buildSenhaEscPos(payload)
    await printBuffer(buffer, PRINTER_CONFIG)
    res.json({ success: true, bytes: buffer.length })
  } catch (err) {
    console.error('Print error:', err)
    res.status(500).json({ error: String(err) })
  }
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`sgvaq-print-bridge running on http://127.0.0.1:${PORT}`)
  console.log(`Printer: ${PRINTER_CONFIG.type} — ${PRINTER_CONFIG.device ?? `${PRINTER_CONFIG.host}:${PRINTER_CONFIG.port}`}`)
})
