'use client'
import { usePrintBridge } from './usePrintBridge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Printer, RefreshCw } from 'lucide-react'

export function PrintBridgeStatus() {
  const { status, checkStatus } = usePrintBridge()

  const variant = status === 'online' ? 'secondary' : status === 'offline' ? 'destructive' : 'outline'
  const label = status === 'online' ? 'Impressora Online' : status === 'offline' ? 'Impressora Offline' : 'Verificando...'

  return (
    <div className="flex items-center gap-2">
      <Printer className="w-4 h-4 text-muted-foreground" />
      <Badge variant={variant}>{label}</Badge>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={checkStatus} title="Verificar impressora">
        <RefreshCw className="w-3 h-3" />
      </Button>
    </div>
  )
}
