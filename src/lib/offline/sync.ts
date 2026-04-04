import { getQueue, removeFromQueue } from './queue'

export type SyncStatus = 'idle' | 'syncing' | 'error'

let syncStatus: SyncStatus = 'idle'
let syncListeners: ((status: SyncStatus, pending: number) => void)[] = []

export function onSyncStatus(cb: (status: SyncStatus, pending: number) => void) {
  syncListeners.push(cb)
  return () => { syncListeners = syncListeners.filter(l => l !== cb) }
}

function notify(status: SyncStatus, pending: number) {
  syncStatus = status
  syncListeners.forEach(l => l(status, pending))
}

export async function syncQueue(accessToken: string): Promise<void> {
  const queue = await getQueue()
  if (queue.length === 0) return

  notify('syncing', queue.length)

  for (const payload of queue) {
    try {
      const res = await fetch('/api/sync-passadas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (res.ok || res.status === 409) {
        // 409 = conflito registrado, já processado
        await removeFromQueue(payload.uuid_local)
      }
    } catch {
      // Falha de rede: mantém na fila
    }
  }

  const remaining = await getQueue()
  notify(remaining.length === 0 ? 'idle' : 'error', remaining.length)
}
