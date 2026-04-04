'use client'
import { useState, useCallback, useEffect } from 'react'
import type { SenhaPayload } from '../../../sgvaq-print-bridge/src/escpos-builder'

const BRIDGE_URL = process.env.NEXT_PUBLIC_PRINT_BRIDGE_URL ?? 'http://127.0.0.1:6789'
const BRIDGE_TOKEN = process.env.NEXT_PUBLIC_PRINT_BRIDGE_TOKEN ?? 'sgvaq-local-dev-token'

export type BridgeStatus = 'unknown' | 'online' | 'offline'

export function usePrintBridge() {
  const [status, setStatus] = useState<BridgeStatus>('unknown')

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BRIDGE_URL}/health`, { signal: AbortSignal.timeout(2000) })
      setStatus(res.ok ? 'online' : 'offline')
    } catch {
      setStatus('offline')
    }
  }, [])

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 30_000)
    return () => clearInterval(interval)
  }, [checkStatus])

  const print = useCallback(async (payload: SenhaPayload): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${BRIDGE_URL}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BRIDGE_TOKEN}`
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000)
      })

      if (!res.ok) {
        const body = await res.json() as { error?: string }
        return { success: false, error: body.error ?? `HTTP ${res.status}` }
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  }, [])

  return { status, print, checkStatus }
}
