import { describe, it, expect } from 'vitest'
import { parseQRCode } from '@/actions/checkin'

describe('parseQRCode', () => {
  it('parseia QR Code válido', () => {
    const qr = JSON.stringify({ senha_id: 'uuid-1', tenant_id: 'tenant-1' })
    const result = parseQRCode(qr)
    expect(result).toEqual({ senha_id: 'uuid-1', tenant_id: 'tenant-1' })
  })

  it('retorna null para QR inválido', () => {
    expect(parseQRCode('texto-invalido')).toBeNull()
    expect(parseQRCode('')).toBeNull()
    expect(parseQRCode('{}')).toBeNull()
  })

  it('retorna null se campos obrigatórios ausentes', () => {
    const qr = JSON.stringify({ senha_id: 'uuid-1' }) // sem tenant_id
    expect(parseQRCode(qr)).toBeNull()
  })
})
